import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import event, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..datetime_utils import as_naive_utc
from ..dependencies import bounded_limit, require_group_member
from ..services import rebuild_balances, to_cents

router = APIRouter(tags=["expenses", "balances", "settlements"])


def validate_participant_totals(expense: schemas.ExpenseCreate) -> None:
    total_paid_cents = sum(to_cents(participant.amount_paid) for participant in expense.participants)
    total_owed_cents = sum(to_cents(participant.amount_owed) for participant in expense.participants)
    total_cents = to_cents(expense.total_amount)
    if total_paid_cents != total_cents or total_owed_cents != total_cents:
        raise HTTPException(status_code=400, detail="Participants paid/owed sum must equal total amount.")


def expense_category_value(category: schemas.ExpenseCategory | None) -> str:
    return category.value if category else "Entertainment / Drinks"


async def get_expense_with_details(db: AsyncSession, expense_id: int) -> models.Expense | None:
    result = await db.execute(
        select(models.Expense)
        .options(
            selectinload(models.Expense.participants),
            joinedload(models.Expense.creator),
            joinedload(models.Expense.group),
        )
        .where(models.Expense.id == expense_id)
    )
    return result.scalar_one_or_none()


async def require_group_expense_participants(
    db: AsyncSession,
    group_id: int,
    current_user_id: int,
    participant_ids: set[int],
) -> None:
    group = await require_group_member(db, group_id, current_user_id)
    member_ids = {member.user_id for member in group.members}
    if not participant_ids.issubset(member_ids):
        raise HTTPException(status_code=400, detail="Group expenses can only include group members.")


async def require_expense_access(db: AsyncSession, expense: models.Expense, current_user_id: int) -> None:
    if expense.group_id:
        await require_group_member(db, expense.group_id, current_user_id)
        return

    participant_ids = {participant.user_id for participant in expense.participants}
    if current_user_id != expense.created_by and current_user_id not in participant_ids:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.post("/expenses/", response_model=schemas.Expense)
async def create_expense(
    expense: schemas.ExpenseCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    participant_ids = {participant.user_id for participant in expense.participants}
    if expense.group_id:
        await require_group_expense_participants(db, expense.group_id, current_user.id, participant_ids)
    elif current_user.id not in participant_ids:
        raise HTTPException(status_code=403, detail="You must be a participant in an individual expense")

    validate_participant_totals(expense)

    db_expense = models.Expense(
        group_id=expense.group_id,
        plan_id=expense.plan_id,
        created_by=current_user.id,
        description=expense.description,
        total_amount=expense.total_amount,
        currency=expense.currency,
        date=as_naive_utc(expense.date) or datetime.datetime.utcnow(),
        category=expense_category_value(expense.category),
        has_receipt=expense.has_receipt or False,
    )
    db.add(db_expense)
    await db.flush()

    db.add_all(
        [
            models.ExpenseParticipant(
                expense_id=db_expense.id,
                user_id=participant.user_id,
                amount_paid=participant.amount_paid,
                amount_owed=participant.amount_owed,
            )
            for participant in expense.participants
        ]
    )
    await rebuild_balances(db, expense.group_id)
    await db.commit()

    reloaded = await get_expense_with_details(db, db_expense.id)
    return schemas.Expense.model_validate(reloaded)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_expense = await get_expense_with_details(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await require_expense_access(db, db_expense, current_user.id)
    group_id = db_expense.group_id
    await db.delete(db_expense)
    await db.flush()
    await rebuild_balances(db, group_id)
    await db.commit()


@router.put("/expenses/{expense_id}", response_model=schemas.Expense)
async def update_expense(
    expense_id: int,
    expense_in: schemas.ExpenseCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_expense = await get_expense_with_details(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if db_expense.group_id:
        await require_group_expense_participants(
            db,
            db_expense.group_id,
            current_user.id,
            {participant.user_id for participant in expense_in.participants},
        )
    else:
        participant_ids = {participant.user_id for participant in db_expense.participants}
        if current_user.id != db_expense.created_by and current_user.id not in participant_ids:
            raise HTTPException(status_code=403, detail="Not authorized to edit this expense")

    validate_participant_totals(expense_in)

    db_expense.description = expense_in.description
    db_expense.total_amount = expense_in.total_amount
    db_expense.currency = expense_in.currency
    db_expense.category = expense_category_value(expense_in.category)
    db_expense.date = as_naive_utc(expense_in.date) or db_expense.date

    for participant in list(db_expense.participants):
        await db.delete(participant)
    await db.flush()

    db.add_all(
        [
            models.ExpenseParticipant(
                expense_id=db_expense.id,
                user_id=participant.user_id,
                amount_paid=participant.amount_paid,
                amount_owed=participant.amount_owed,
            )
            for participant in expense_in.participants
        ]
    )
    await rebuild_balances(db, db_expense.group_id)
    await db.commit()

    reloaded = await get_expense_with_details(db, db_expense.id)
    return schemas.Expense.model_validate(reloaded)


@router.get("/balances/{user_id}", response_model=list[schemas.BalanceSummary])
async def get_user_balances(
    user_id: int,
    group_id: int | None = None,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' balances")

    statement = select(models.Balance).where(
        or_(models.Balance.from_user_id == user_id, models.Balance.to_user_id == user_id)
    )
    if group_id:
        statement = statement.where(models.Balance.group_id == group_id)

    balances_result = await db.execute(statement)
    return balances_result.scalars().all()


@router.get("/balances/summary/{user_id}")
async def get_global_balance_summary(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' balances")

    owes_result = await db.execute(
        select(func.coalesce(func.sum(models.Balance.amount), 0)).where(models.Balance.from_user_id == user_id)
    )
    owed_result = await db.execute(
        select(func.coalesce(func.sum(models.Balance.amount), 0)).where(models.Balance.to_user_id == user_id)
    )
    owes = owes_result.scalar_one()
    owed = owed_result.scalar_one()
    return {"total_owes": owes, "total_owed": owed, "net_balance": owed - owes}


@router.post("/settlements/", response_model=schemas.Settlement)
async def create_settlement(
    settlement: schemas.SettlementCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id not in [settlement.payer_id, settlement.payee_id]:
        raise HTTPException(status_code=403, detail="You can only settle your own debts.")
    if settlement.payer_id == settlement.payee_id:
        raise HTTPException(status_code=400, detail="Payer and payee must be different users.")
    if settlement.amount <= 0:
        raise HTTPException(status_code=400, detail="Settlement amount must be positive.")

    settlement_cents = to_cents(settlement.amount)
    if settlement.group_id is not None:
        group = await require_group_member(db, settlement.group_id, current_user.id)
        member_ids = {member.user_id for member in group.members}
        if settlement.payer_id not in member_ids or settlement.payee_id not in member_ids:
            raise HTTPException(status_code=403, detail="Payer and payee must both be group members.")

        balance_result = await db.execute(
            select(models.Balance).where(
                models.Balance.group_id == settlement.group_id,
                models.Balance.from_user_id == settlement.payer_id,
                models.Balance.to_user_id == settlement.payee_id,
            )
        )
        balance = balance_result.scalar_one_or_none()
        outstanding_amount = balance.amount if balance else 0
        outstanding_cents = to_cents(outstanding_amount)
        if outstanding_cents <= 0:
            raise HTTPException(status_code=400, detail="No outstanding balance exists in this payer/payee direction.")
        if settlement_cents > outstanding_cents:
            raise HTTPException(
                status_code=400,
                detail=f"Settlement amount cannot exceed the outstanding balance of ${outstanding_amount:.2f}.",
            )

        db_settlement = models.Settlement(
            group_id=settlement.group_id,
            payer_id=settlement.payer_id,
            payee_id=settlement.payee_id,
            amount=settlement.amount,
            currency=settlement.currency,
            date=datetime.datetime.utcnow(),
            status="COMPLETED",
        )
        db.add(db_settlement)
        await db.flush()
        await rebuild_balances(db, settlement.group_id)
        await db.commit()
        await db.refresh(db_settlement)
        return db_settlement

    balances_result = await db.execute(
        select(models.Balance)
        .where(
            models.Balance.from_user_id == settlement.payer_id,
            models.Balance.to_user_id == settlement.payee_id,
        )
        .order_by(models.Balance.amount.desc())
    )
    balances = balances_result.scalars().all()

    outstanding_amount = sum(balance.amount for balance in balances)
    outstanding_cents = to_cents(outstanding_amount)
    if outstanding_cents <= 0:
        raise HTTPException(status_code=400, detail="No outstanding balance exists in this payer/payee direction.")
    if settlement_cents > outstanding_cents:
        raise HTTPException(
            status_code=400,
            detail=f"Settlement amount cannot exceed the outstanding balance of ${outstanding_amount:.2f}.",
        )

    remaining = settlement.amount
    groups_to_rebuild = set()
    first_settlement = None
    for balance in balances:
        if remaining <= 0.01:
            break
        settle_amount = min(balance.amount, remaining)
        remaining -= settle_amount

        sub_settlement = models.Settlement(
            group_id=balance.group_id,
            payer_id=settlement.payer_id,
            payee_id=settlement.payee_id,
            amount=settle_amount,
            currency=settlement.currency,
            date=datetime.datetime.utcnow(),
            status="COMPLETED",
        )
        db.add(sub_settlement)
        await db.flush()
        if first_settlement is None:
            first_settlement = sub_settlement
        groups_to_rebuild.add(balance.group_id)

    for group_id in groups_to_rebuild:
        await rebuild_balances(db, group_id)
    await db.commit()
    await db.refresh(first_settlement)
    return first_settlement


@router.get("/users/{user_id}/expenses", response_model=list[schemas.ExpenseWithCreator])
async def get_all_user_expenses(
    user_id: int,
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' expenses")

    expenses_result = await db.execute(
        select(models.Expense)
        .options(
            selectinload(models.Expense.participants),
            joinedload(models.Expense.creator),
            joinedload(models.Expense.group),
        )
        .outerjoin(models.ExpenseParticipant)
        .where(or_(models.Expense.created_by == user_id, models.ExpenseParticipant.user_id == user_id))
        .order_by(models.Expense.date.desc())
        .offset(skip)
        .limit(limit)
    )

    result = []
    for expense in expenses_result.scalars().unique().all():
        item = schemas.ExpenseWithCreator.model_validate(expense)
        item.creator_name = expense.creator.name if expense.creator else None
        item.group_name = expense.group.name if expense.group else None
        result.append(item)
    return result


@router.get("/users/{user_id}/settlements", response_model=list[schemas.Settlement])
async def get_all_user_settlements(
    user_id: int,
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' settlements")

    settlements_result = await db.execute(
        select(models.Settlement)
        .where(or_(models.Settlement.payer_id == user_id, models.Settlement.payee_id == user_id))
        .order_by(models.Settlement.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return settlements_result.scalars().all()


@router.get("/expenses/{expense_id}/audit", response_model=list[schemas.AuditLog])
async def get_expense_audit_logs(
    expense_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    expense = await get_expense_with_details(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await require_expense_access(db, expense, current_user.id)

    logs_result = await db.execute(
        select(models.AuditLog)
        .where(models.AuditLog.target_type == "Expense", models.AuditLog.target_id == expense_id)
        .order_by(models.AuditLog.timestamp.asc())
    )
    return logs_result.scalars().all()


def log_change(mapper, connection, target, action):
    target_type = target.__class__.__name__
    if target_type not in ["Expense", "Group", "Settlement"]:
        return

    user_id = None
    if hasattr(target, "created_by"):
        user_id = target.created_by
    elif hasattr(target, "payer_id"):
        user_id = target.payer_id

    changes_dict = {column.name: getattr(target, column.name) for column in target.__table__.columns}
    changes = json.dumps(jsonable_encoder(changes_dict))

    connection.execute(
        models.AuditLog.__table__.insert().values(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target.id,
            changes=changes,
        )
    )


@event.listens_for(models.Expense, "after_insert")
def receive_expense_after_insert(mapper, connection, target):
    log_change(mapper, connection, target, "CREATE")


@event.listens_for(models.Expense, "after_update")
def receive_expense_after_update(mapper, connection, target):
    log_change(mapper, connection, target, "UPDATE")


@event.listens_for(models.Group, "after_insert")
def receive_group_after_insert(mapper, connection, target):
    log_change(mapper, connection, target, "CREATE")


@event.listens_for(models.Settlement, "after_insert")
def receive_settlement_after_insert(mapper, connection, target):
    log_change(mapper, connection, target, "CREATE")
