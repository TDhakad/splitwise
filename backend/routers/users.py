import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..dependencies import bounded_limit

router = APIRouter(tags=["users", "friends"])


@router.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/users/", response_model=list[schemas.User])
async def read_users(
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendships_result = await db.execute(
        select(models.Friendship).where(
            and_(
                or_(
                    models.Friendship.requester_id == current_user.id,
                    models.Friendship.addressee_id == current_user.id,
                ),
                models.Friendship.status == "ACCEPTED",
            )
        )
    )
    friendships = friendships_result.scalars().all()
    friend_ids = {
        friendship.requester_id if friendship.requester_id != current_user.id else friendship.addressee_id
        for friendship in friendships
    }
    if not friend_ids:
        return []

    users_result = await db.execute(
        select(models.User).where(models.User.id.in_(friend_ids)).offset(skip).limit(limit)
    )
    return users_result.scalars().all()


@router.post("/friends/request", response_model=schemas.Friendship)
async def send_friend_request(
    request: schemas.FriendshipCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")

    addressee_result = await db.execute(select(models.User).where(models.User.email == request.email))
    addressee = addressee_result.scalar_one_or_none()
    if not addressee:
        raise HTTPException(status_code=404, detail="User not found with that email")

    existing_result = await db.execute(
        select(models.Friendship).where(
            or_(
                and_(
                    models.Friendship.requester_id == current_user.id,
                    models.Friendship.addressee_id == addressee.id,
                ),
                and_(
                    models.Friendship.requester_id == addressee.id,
                    models.Friendship.addressee_id == current_user.id,
                ),
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        if existing.status in ["REMOVED", "REJECTED"]:
            existing.status = "PENDING"
            existing.requester_id = current_user.id
            existing.addressee_id = addressee.id
            existing.updated_at = datetime.datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail=f"Friendship already exists with status: {existing.status}")

    new_request = models.Friendship(
        requester_id=current_user.id,
        addressee_id=addressee.id,
        status="PENDING",
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)
    return new_request


@router.put("/friends/request/{id}", response_model=schemas.Friendship)
async def update_friend_request(
    id: int,
    status: str,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(models.Friendship, id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Request not found")

    if status not in ["ACCEPTED", "REJECTED", "REMOVED"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    if status in ["ACCEPTED", "REJECTED"] and friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept/reject this request")

    if status == "REMOVED" and current_user.id not in [friendship.requester_id, friendship.addressee_id]:
        raise HTTPException(status_code=403, detail="Not authorized to remove this friendship")

    friendship.status = status
    friendship.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(friendship)
    return friendship


@router.get("/friends/requests", response_model=list[schemas.FriendshipWithUsers])
async def get_friend_requests(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    requests_result = await db.execute(
        select(models.Friendship)
        .options(selectinload(models.Friendship.requester), selectinload(models.Friendship.addressee))
        .where(
            and_(
                or_(
                    models.Friendship.requester_id == current_user.id,
                    models.Friendship.addressee_id == current_user.id,
                ),
                models.Friendship.status == "PENDING",
            )
        )
    )
    return requests_result.scalars().all()
