import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..datetime_utils import as_naive_utc
from ..dependencies import bounded_limit, require_group_member
from ..services import compute_balances_for_group, compute_balances_for_user, create_audit_log_background, to_cents

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
    background_tasks: BackgroundTasks,
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
        date=as_naive_utc(expense.date) or datetime.datetime.now(datetime.timezone.utc),
        category=expense_category_value(expense.category),
        has_receipt=expense.has_receipt or False,
        receipt_breakdown=jsonable_encoder(expense.receipt_breakdown) if expense.receipt_breakdown is not None else None,
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
    await db.commit()
    background_tasks.add_task(create_audit_log_background, "Expense", db_expense.id, current_user.id, "CREATE")

    reloaded = await get_expense_with_details(db, db_expense.id)
    return schemas.Expense.model_validate(reloaded)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_expense = await get_expense_with_details(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if db_expense.is_deleted:
        raise HTTPException(status_code=400, detail="Expense is already deleted")

    await require_expense_access(db, db_expense, current_user.id)
    group_id = db_expense.group_id
    db_expense.is_deleted = True
    db_expense.deleted_by = current_user.id
    db_expense.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    background_tasks.add_task(create_audit_log_background, "Expense", expense_id, current_user.id, "DELETE")


@router.put("/expenses/{expense_id}", response_model=schemas.Expense)
async def update_expense(
    expense_id: int,
    expense_in: schemas.ExpenseCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_expense = await get_expense_with_details(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if db_expense.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot update a deleted expense")

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

    changes = []
    
    if db_expense.description != expense_in.description:
        changes.append({"type": "field", "field": "description", "old": db_expense.description, "new": expense_in.description})
        
    if abs(db_expense.total_amount - expense_in.total_amount) > 0.005:
        changes.append({"type": "field", "field": "total_amount", "old": db_expense.total_amount, "new": expense_in.total_amount})

    if db_expense.currency != expense_in.currency:
        changes.append({"type": "field", "field": "currency", "old": db_expense.currency, "new": expense_in.currency})

    new_category = expense_category_value(expense_in.category)
    if db_expense.category != new_category:
        changes.append({"type": "field", "field": "category", "old": db_expense.category, "new": new_category})

    if "has_receipt" in expense_in.model_fields_set and db_expense.has_receipt != expense_in.has_receipt:
        changes.append({"type": "field", "field": "has_receipt", "old": db_expense.has_receipt, "new": expense_in.has_receipt})

    new_date = as_naive_utc(expense_in.date) or db_expense.date
    if db_expense.date != new_date:
        changes.append({"type": "field", "field": "date", "old": db_expense.date.isoformat() if db_expense.date else None, "new": new_date.isoformat() if new_date else None})

    old_participants = {p.user_id: p for p in db_expense.participants}
    new_participants = {p.user_id: p for p in expense_in.participants}
    
    for p_in in expense_in.participants:
        p_old = old_participants.get(p_in.user_id)
        if p_old:
            if abs(p_old.amount_paid - p_in.amount_paid) > 0.005:
                changes.append({"type": "split", "user_id": p_in.user_id, "field": "amount_paid", "old": p_old.amount_paid, "new": p_in.amount_paid})
            if abs(p_old.amount_owed - p_in.amount_owed) > 0.005:
                changes.append({"type": "split", "user_id": p_in.user_id, "field": "amount_owed", "old": p_old.amount_owed, "new": p_in.amount_owed})
        else:
            changes.append({"type": "split", "user_id": p_in.user_id, "field": "amount_owed", "old": 0, "new": p_in.amount_owed})
            if p_in.amount_paid > 0:
                changes.append({"type": "split", "user_id": p_in.user_id, "field": "amount_paid", "old": 0, "new": p_in.amount_paid})
            
    for u_id, p_old in old_participants.items():
        if u_id not in new_participants:
            changes.append({"type": "split", "user_id": u_id, "field": "amount_owed", "old": p_old.amount_owed, "new": 0})
            if p_old.amount_paid > 0:
                changes.append({"type": "split", "user_id": u_id, "field": "amount_paid", "old": p_old.amount_paid, "new": 0})

    db_expense.description = expense_in.description
    db_expense.total_amount = expense_in.total_amount
    db_expense.currency = expense_in.currency
    db_expense.category = new_category
    db_expense.date = new_date
    if "has_receipt" in expense_in.model_fields_set:
        db_expense.has_receipt = expense_in.has_receipt
    if "receipt_breakdown" in expense_in.model_fields_set:
        db_expense.receipt_breakdown = (
            jsonable_encoder(expense_in.receipt_breakdown)
            if expense_in.receipt_breakdown is not None
            else None
        )

    incoming_participants_map = {p.user_id: p for p in expense_in.participants}
    
    # Update existing and remove deleted
    for p_old in list(db_expense.participants):
        if p_old.user_id in incoming_participants_map:
            p_in = incoming_participants_map[p_old.user_id]
            p_old.amount_paid = p_in.amount_paid
            p_old.amount_owed = p_in.amount_owed
            del incoming_participants_map[p_old.user_id]
        else:
            db_expense.participants.remove(p_old)
            
    # Add new participants
    for p_in in incoming_participants_map.values():
        db_expense.participants.append(
            models.ExpenseParticipant(
                user_id=p_in.user_id,
                amount_paid=p_in.amount_paid,
                amount_owed=p_in.amount_owed,
            )
        )
    
    if changes:
        background_tasks.add_task(create_audit_log_background, "Expense", db_expense.id, current_user.id, "UPDATE", json.dumps(changes))

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

    if group_id:
        balances = await compute_balances_for_group(db, group_id)
        return [b for b in balances if b["from_user_id"] == user_id or b["to_user_id"] == user_id]
    
    balances = await compute_balances_for_user(db, user_id)
    return balances


@router.get("/balances/summary/{user_id}")
async def get_global_balance_summary(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' balances")

    balances = await compute_balances_for_user(db, user_id)
    owes = sum(b["amount"] for b in balances if b["from_user_id"] == user_id)
    owed = sum(b["amount"] for b in balances if b["to_user_id"] == user_id)
    return {"total_owes": owes, "total_owed": owed, "net_balance": owed - owes}


@router.post("/settlements/", response_model=schemas.Settlement)
async def create_settlement(
    settlement: schemas.SettlementCreate,
    background_tasks: BackgroundTasks,
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

        balances = await compute_balances_for_group(db, settlement.group_id)
        balance = next((b for b in balances if b["from_user_id"] == settlement.payer_id and b["to_user_id"] == settlement.payee_id), None)
        outstanding_amount = balance["amount"] if balance else 0
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
            date=datetime.datetime.now(datetime.timezone.utc),
            status="COMPLETED",
        )
        db.add(db_settlement)
        await db.commit()
        await db.refresh(db_settlement)
        background_tasks.add_task(create_audit_log_background, "Settlement", db_settlement.id, current_user.id, "CREATE")
        return db_settlement

    balances = await compute_balances_for_user(db, settlement.payer_id)
    filtered_balances = sorted(
        [b for b in balances if b["from_user_id"] == settlement.payer_id and b["to_user_id"] == settlement.payee_id],
        key=lambda x: x["amount"],
        reverse=True
    )

    outstanding_amount = sum(balance["amount"] for balance in filtered_balances)
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
    for balance in filtered_balances:
        if remaining <= 0.01:
            break
        settle_amount = min(balance["amount"], remaining)
        remaining -= settle_amount

        sub_settlement = models.Settlement(
            group_id=balance["group_id"],
            payer_id=settlement.payer_id,
            payee_id=settlement.payee_id,
            amount=settle_amount,
            currency=settlement.currency,
            date=datetime.datetime.now(datetime.timezone.utc),
            status="COMPLETED",
        )
        db.add(sub_settlement)
        await db.flush()
        if first_settlement is None:
            first_settlement = sub_settlement

    await db.commit()
    await db.refresh(first_settlement)
    background_tasks.add_task(create_audit_log_background, "Settlement", first_settlement.id, current_user.id, "CREATE")
    return first_settlement


@router.put("/settlements/{settlement_id}", response_model=schemas.Settlement)
async def update_settlement(
    settlement_id: int,
    settlement_update: schemas.SettlementUpdate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_settlement = await db.get(models.Settlement, settlement_id)
    if not db_settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    if current_user.id not in [db_settlement.payer_id, db_settlement.payee_id]:
        raise HTTPException(status_code=403, detail="You can only modify your own settlements.")
    
    db_settlement.amount = settlement_update.amount
    await db.commit()
    await db.refresh(db_settlement)
    background_tasks.add_task(create_audit_log_background, "Settlement", db_settlement.id, current_user.id, "UPDATE", f"Amount changed to {settlement_update.amount}")
    return db_settlement


@router.delete("/settlements/{settlement_id}", status_code=204)
async def delete_settlement(
    settlement_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_settlement = await db.get(models.Settlement, settlement_id)
    if not db_settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    if current_user.id not in [db_settlement.payer_id, db_settlement.payee_id]:
        raise HTTPException(status_code=403, detail="You can only delete your own settlements.")
    
    await db.delete(db_settlement)
    await db.commit()
    background_tasks.add_task(create_audit_log_background, "Settlement", settlement_id, current_user.id, "DELETE")
    return None


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



