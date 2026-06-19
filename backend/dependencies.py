from fastapi import HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from . import models


async def get_group_with_members(db: AsyncSession, group_id: int) -> models.Group | None:
    result = await db.execute(
        select(models.Group)
        .options(selectinload(models.Group.members).selectinload(models.GroupMember.user))
        .where(models.Group.id == group_id)
    )
    return result.scalar_one_or_none()


async def require_group_member(db: AsyncSession, group_id: int, user_id: int) -> models.Group:
    group = await get_group_with_members(db, group_id)
    if not group or user_id not in {member.user_id for member in group.members}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this group")
    return group


async def require_group_manager(db: AsyncSession, group_id: int, user_id: int) -> models.Group:
    group = await get_group_with_members(db, group_id)
    if not group or user_id not in {member.user_id for member in group.members}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to manage this group")
    return group


async def require_plan_owner(db: AsyncSession, plan_id: int, user_id: int) -> models.Plan:
    plan = await db.get(models.Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    if plan.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return plan


async def validate_user_group_ids(db: AsyncSession, group_ids: list[int], user_id: int) -> None:
    if not group_ids:
        return
    result = await db.execute(
        select(models.GroupMember.group_id).where(
            models.GroupMember.user_id == user_id,
            models.GroupMember.group_id.in_(group_ids),
        )
    )
    visible_group_ids = set(result.scalars().all())
    if visible_group_ids != set(group_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only track groups you belong to")


def bounded_limit(limit: int = Query(100, ge=1, le=100)) -> int:
    return limit
