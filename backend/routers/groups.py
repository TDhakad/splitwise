from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..dependencies import bounded_limit, require_group_manager, require_group_member
from ..services import rebuild_balances

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/", response_model=schemas.Group)
async def create_group(
    group: schemas.GroupCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_group = models.Group(**group.model_dump(), created_by=current_user.id)
    db.add(db_group)
    await db.flush()

    db.add(models.GroupMember(group_id=db_group.id, user_id=current_user.id))
    await db.commit()
    await db.refresh(db_group)
    return db_group


@router.get("/", response_model=list[schemas.GroupDetail])
async def read_groups(
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    groups_result = await db.execute(
        select(models.Group)
        .options(selectinload(models.Group.members).selectinload(models.GroupMember.user))
        .join(models.GroupMember)
        .where(models.GroupMember.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    groups = groups_result.scalars().unique().all()
    return [
        {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "simplify_debts": group.simplify_debts,
            "created_by": group.created_by,
            "created_at": group.created_at,
            "members": [member.user for member in group.members],
        }
        for group in groups
    ]


@router.get("/{group_id}", response_model=schemas.GroupDetail)
async def read_group(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await require_group_member(db, group_id, current_user.id)
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "simplify_debts": group.simplify_debts,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "members": [member.user for member in group.members],
    }


@router.get("/{group_id}/expenses", response_model=list[schemas.ExpenseWithCreator])
async def read_group_expenses(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_group_member(db, group_id, current_user.id)
    expenses_result = await db.execute(
        select(models.Expense)
        .options(
            selectinload(models.Expense.participants),
            joinedload(models.Expense.creator),
        )
        .where(models.Expense.group_id == group_id)
        .order_by(models.Expense.date.desc())
    )
    result = []
    for expense in expenses_result.scalars().unique().all():
        item = schemas.ExpenseWithCreator.model_validate(expense)
        item.creator_name = expense.creator.name if expense.creator else None
        result.append(item)
    return result


@router.get("/{group_id}/settlements", response_model=list[schemas.Settlement])
async def read_group_settlements(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_group_member(db, group_id, current_user.id)
    settlements_result = await db.execute(
        select(models.Settlement)
        .where(models.Settlement.group_id == group_id)
        .order_by(models.Settlement.date.desc())
    )
    return settlements_result.scalars().all()


@router.get("/{group_id}/balances", response_model=list[schemas.BalanceSummary])
async def read_group_balances(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_group_member(db, group_id, current_user.id)
    balances_result = await db.execute(select(models.Balance).where(models.Balance.group_id == group_id))
    return balances_result.scalars().all()


@router.post("/{group_id}/members/{user_id}")
async def add_group_member(
    group_id: int,
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await require_group_manager(db, group_id, current_user.id)
    if user_id in {member.user_id for member in group.members}:
        return {"status": "success"}

    user = await db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.add(models.GroupMember(group_id=group_id, user_id=user_id))
    await db.commit()
    return {"status": "success"}


@router.put("/{group_id}/simplify")
async def toggle_simplify_debts(
    group_id: int,
    enable: bool,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await require_group_manager(db, group_id, current_user.id)
    group.simplify_debts = enable
    await rebuild_balances(db, group_id)
    await db.commit()
    return {"status": "success", "simplify_debts": enable}
