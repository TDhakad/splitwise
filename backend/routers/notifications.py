from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..dependencies import bounded_limit
from ..notifications import notification_stream_response

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=schemas.NotificationList)
async def list_notifications(
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    unread_only: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [models.Notification.user_id == current_user.id]
    if unread_only:
        filters.append(models.Notification.read_at.is_(None))

    notifications_result = await db.execute(
        select(models.Notification)
        .where(*filters)
        .order_by(models.Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    unread_result = await db.execute(
        select(func.count())
        .select_from(models.Notification)
        .where(models.Notification.user_id == current_user.id, models.Notification.read_at.is_(None))
    )
    return {
        "notifications": notifications_result.scalars().all(),
        "unread_count": unread_result.scalar_one(),
    }


@router.post("/{notification_id}/read", response_model=schemas.Notification)
async def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = await db.get(models.Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notification)
    return notification


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifications_result = await db.execute(
        select(models.Notification).where(
            models.Notification.user_id == current_user.id,
            models.Notification.read_at.is_(None),
        )
    )
    now = datetime.now(timezone.utc)
    for notification in notifications_result.scalars().all():
        notification.read_at = now
    await db.commit()
    return {"status": "success"}


@router.get("/stream")
async def stream_notifications(
    token: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
        email = payload.get("sub")
        if user_id is None or email is None:
            raise JWTError()
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user = await db.get(models.User, user_id)
    if not user or user.email != email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    initial_result = await db.execute(
        select(models.Notification)
        .where(models.Notification.user_id == user.id, models.Notification.read_at.is_(None))
        .order_by(models.Notification.created_at.asc())
        .limit(50)
    )
    return notification_stream_response(user.id, initial_result.scalars().all())
