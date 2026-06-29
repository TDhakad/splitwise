import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..datetime_utils import as_naive_utc
from ..dependencies import bounded_limit, require_group_manager, require_group_member
from ..notifications import create_notification
from ..services import compute_balances_for_group, create_audit_log_background, ensure_friendship_between

router = APIRouter(prefix="/groups", tags=["groups"])


async def add_member_to_group(
    db: AsyncSession,
    group: models.Group,
    user: models.User,
    actor: models.User,
) -> bool:
    if user.id in {member.user_id for member in group.members}:
        return False

    existing_member_ids = [member.user_id for member in group.members]
    db.add(models.GroupMember(group_id=group.id, user_id=user.id))
    await db.flush()

    for member_id in existing_member_ids:
        await ensure_friendship_between(db, actor.id, member_id)
        await ensure_friendship_between(db, user.id, member_id)

    await create_notification(
        db,
        user.id,
        "group_member_added",
        actor.id,
        "Group",
        group.id,
        {"group_name": group.name},
    )
    return True


def group_detail_response(group: models.Group) -> dict:
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "simplify_debts": group.simplify_debts,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "members": [member.user for member in group.members],
    }


@router.post("/", response_model=schemas.GroupDetail)
async def create_group(
    group: schemas.GroupCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group_data = group.model_dump(exclude={"member_ids", "member_emails"})
    db_group = models.Group(**group_data, created_by=current_user.id)
    db.add(db_group)
    await db.flush()

    db.add(models.GroupMember(group_id=db_group.id, user_id=current_user.id))
    await db.flush()

    users_by_id = {}
    if group.member_ids:
        users_result = await db.execute(select(models.User).where(models.User.id.in_(set(group.member_ids))))
        users_by_id = {user.id: user for user in users_result.scalars().all()}
        missing_ids = set(group.member_ids) - set(users_by_id)
        if missing_ids:
            raise HTTPException(status_code=404, detail="One or more users were not found")

    users_by_email = {}
    if group.member_emails:
        normalized_emails = {email.lower() for email in group.member_emails}
        users_result = await db.execute(select(models.User).where(func.lower(models.User.email).in_(normalized_emails)))
        users_by_email = {user.email.lower(): user for user in users_result.scalars().all()}
        missing_emails = normalized_emails - set(users_by_email)
        if missing_emails:
            raise HTTPException(status_code=404, detail="One or more users were not found")

    users_to_add = {
        user.id: user
        for user in [*users_by_id.values(), *users_by_email.values()]
        if user.id != current_user.id
    }
    member_ids = [current_user.id]
    for user in users_to_add.values():
        db.add(models.GroupMember(group_id=db_group.id, user_id=user.id))
        await db.flush()
        for member_id in member_ids:
            await ensure_friendship_between(db, user.id, member_id)
        await create_notification(
            db,
            user.id,
            "group_member_added",
            current_user.id,
            "Group",
            db_group.id,
            {"group_name": db_group.name},
        )
        member_ids.append(user.id)

    await db.commit()
    background_tasks.add_task(create_audit_log_background, "Group", db_group.id, current_user.id, "CREATE")
    reloaded = await require_group_member(db, db_group.id, current_user.id)
    return group_detail_response(reloaded)


@router.get("/", response_model=list[schemas.GroupDetail])
async def read_groups(
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    search: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [models.GroupMember.user_id == current_user.id]
    if search:
        filters.append(models.Group.name.ilike(f"%{search}%"))
    groups_result = await db.execute(
        select(models.Group)
        .options(selectinload(models.Group.members).selectinload(models.GroupMember.user))
        .join(models.GroupMember)
        .where(*filters)
        .offset(skip)
        .limit(limit)
    )
    groups = groups_result.scalars().unique().all()
    return [
        group_detail_response(group)
        for group in groups
    ]


@router.get("/{group_id}", response_model=schemas.GroupDetail)
async def read_group(
    group_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await require_group_member(db, group_id, current_user.id)
    return group_detail_response(group)


@router.get("/{group_id}/expenses", response_model=list[schemas.ExpenseWithCreator])
async def read_group_expenses(
    group_id: int,
    start_date: datetime.datetime | None = None,
    end_date: datetime.datetime | None = None,
    category: str | None = None,
    plan_id: int | None = None,
    search: str | None = None,
    include_deleted: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_group_member(db, group_id, current_user.id)
    filters = [models.Expense.group_id == group_id]
    if not include_deleted:
        filters.append(models.Expense.is_deleted == False)
    if start_date is not None:
        filters.append(models.Expense.date >= as_naive_utc(start_date))
    if end_date is not None:
        filters.append(models.Expense.date <= as_naive_utc(end_date))
    if category:
        filters.append(models.Expense.category == category)
    if plan_id is not None:
        filters.append(models.Expense.plan_id == plan_id)
    if search:
        filters.append(models.Expense.description.ilike(f"%{search}%"))
    expenses_result = await db.execute(
        select(models.Expense)
        .options(
            selectinload(models.Expense.participants),
            joinedload(models.Expense.creator),
        )
        .where(*filters)
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
    start_date: datetime.datetime | None = None,
    end_date: datetime.datetime | None = None,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_group_member(db, group_id, current_user.id)
    filters = [models.Settlement.group_id == group_id]
    if start_date is not None:
        filters.append(models.Settlement.date >= as_naive_utc(start_date))
    if end_date is not None:
        filters.append(models.Settlement.date <= as_naive_utc(end_date))
    settlements_result = await db.execute(
        select(models.Settlement)
        .where(*filters)
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
    balances = await compute_balances_for_group(db, group_id)
    return balances


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

    await add_member_to_group(db, group, user, current_user)
    await db.commit()
    return {"status": "success"}


@router.post("/{group_id}/members")
async def add_group_member_by_payload(
    group_id: int,
    member: schemas.GroupMemberCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if member.user_id is None and member.email is None:
        raise HTTPException(status_code=400, detail="Provide user_id or email")

    group = await require_group_manager(db, group_id, current_user.id)
    user = None
    if member.user_id is not None:
        user = await db.get(models.User, member.user_id)
    elif member.email is not None:
        result = await db.execute(select(models.User).where(func.lower(models.User.email) == member.email.lower()))
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await add_member_to_group(db, group, user, current_user)
    await db.commit()
    return {"status": "success"}


@router.delete("/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # User can leave themselves, OR group manager can remove them
    if current_user.id != user_id:
        group = await require_group_manager(db, group_id, current_user.id)
    else:
        # User is leaving themselves, ensure they are in the group
        group = await db.get(models.Group, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

    result = await db.execute(
        select(models.GroupMember)
        .where(models.GroupMember.group_id == group_id, models.GroupMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this group")

    # The user asked to allow leaving even with balances, just show warning.
    # We remove the GroupMember record.
    await db.delete(member)
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
    await db.commit()
    return {"status": "success", "simplify_debts": enable}
