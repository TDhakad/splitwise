from collections import defaultdict

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models


from .database import SessionLocal
import json
from . import schemas

def to_cents(amount: float) -> int:
    return round(amount * 100)

async def compute_balances_for_group(db: AsyncSession, group_id: int | None) -> list[dict]:
    group = await db.get(models.Group, group_id) if group_id is not None else None
    simplify_debts = group.simplify_debts if group else True
    balance_rows = []

    settlements_result = await db.execute(
        select(
            models.Settlement.payer_id,
            models.Settlement.payee_id,
            models.Settlement.amount,
        ).where(models.Settlement.group_id == group_id)
    )
    settlements = settlements_result.all()

    if simplify_debts:
        nets = defaultdict(float)
        participant_result = await db.execute(
            select(
                models.ExpenseParticipant.user_id,
                func.sum(models.ExpenseParticipant.amount_paid - models.ExpenseParticipant.amount_owed),
            )
            .join(models.Expense)
            .where(models.Expense.group_id == group_id)
            .group_by(models.ExpenseParticipant.user_id)
        )

        for user_id, net_amount in participant_result.all():
            nets[user_id] += (net_amount or 0)
        for payer_id, payee_id, amount in settlements:
            nets[payer_id] += amount
            nets[payee_id] -= amount

        creditors = {user_id: amount for user_id, amount in nets.items() if amount > 0.01}
        debtors = {user_id: -amount for user_id, amount in nets.items() if amount < -0.01}

        for debtor_id, debtor_amount in debtors.items():
            for creditor_id, creditor_amount in list(creditors.items()):
                if debtor_amount <= 0.01:
                    break
                if creditor_amount <= 0.01:
                    continue
                settle = min(debtor_amount, creditor_amount)
                debtor_amount -= settle
                creditors[creditor_id] -= settle
                balance_rows.append({
                    "group_id": group_id,
                    "from_user_id": debtor_id,
                    "to_user_id": creditor_id,
                    "amount": settle,
                })
    else:
        pairwise = defaultdict(lambda: defaultdict(float))

        def apply_expense_nets(expense_nets: defaultdict[int, float]) -> None:
            expense_creditors = {user_id: amount for user_id, amount in expense_nets.items() if amount > 0.01}
            expense_debtors = {user_id: -amount for user_id, amount in expense_nets.items() if amount < -0.01}

            for debtor_id, debtor_amount in expense_debtors.items():
                for creditor_id, creditor_amount in list(expense_creditors.items()):
                    if debtor_amount <= 0.01:
                        break
                    if creditor_amount <= 0.01:
                        continue
                    settle = min(debtor_amount, creditor_amount)
                    debtor_amount -= settle
                    expense_creditors[creditor_id] -= settle
                    pairwise[debtor_id][creditor_id] += settle

        participant_rows = await db.execute(
            select(
                models.ExpenseParticipant.expense_id,
                models.ExpenseParticipant.user_id,
                models.ExpenseParticipant.amount_paid,
                models.ExpenseParticipant.amount_owed,
            )
            .join(models.Expense)
            .where(models.Expense.group_id == group_id)
            .order_by(models.ExpenseParticipant.expense_id)
        )

        current_expense_id = None
        expense_nets = defaultdict(float)
        for expense_id, user_id, amount_paid, amount_owed in participant_rows.all():
            if current_expense_id is not None and expense_id != current_expense_id:
                apply_expense_nets(expense_nets)
                expense_nets = defaultdict(float)
            current_expense_id = expense_id
            expense_nets[user_id] += amount_paid - amount_owed
        if current_expense_id is not None:
            apply_expense_nets(expense_nets)

        for payer_id, payee_id, amount in settlements:
            pairwise[payer_id][payee_id] -= amount

        resolved = set()
        for first_user_id, edges in list(pairwise.items()):
            for second_user_id, amount_ab in list(edges.items()):
                if (first_user_id, second_user_id) in resolved or (second_user_id, first_user_id) in resolved:
                    continue
                net_ab = amount_ab - pairwise.get(second_user_id, {}).get(first_user_id, 0)
                if net_ab > 0.01:
                    balance_rows.append({
                        "group_id": group_id,
                        "from_user_id": first_user_id,
                        "to_user_id": second_user_id,
                        "amount": net_ab,
                    })
                elif net_ab < -0.01:
                    balance_rows.append({
                        "group_id": group_id,
                        "from_user_id": second_user_id,
                        "to_user_id": first_user_id,
                        "amount": -net_ab,
                    })
                resolved.add((first_user_id, second_user_id))

    return balance_rows

async def compute_balances_for_user(db: AsyncSession, user_id: int) -> list[dict]:
    # Find all groups where the user has an expense or is a member
    group_ids_result = await db.execute(
        select(models.Expense.group_id)
        .join(models.ExpenseParticipant)
        .where(models.ExpenseParticipant.user_id == user_id)
        .distinct()
    )
    group_ids = {row[0] for row in group_ids_result.all()}
    
    # Also add groups where the user is a member, even if no expenses yet
    member_groups_result = await db.execute(
        select(models.GroupMember.group_id)
        .where(models.GroupMember.user_id == user_id)
    )
    group_ids.update({row[0] for row in member_groups_result.all()})

    all_balances = []
    # Include group_id = None (non-group expenses)
    if None not in group_ids:
        group_ids.add(None)

    for g_id in group_ids:
        group_balances = await compute_balances_for_group(db, g_id)
        # Filter balances to only those involving the user
        user_balances = [
            b for b in group_balances
            if b["from_user_id"] == user_id or b["to_user_id"] == user_id
        ]
        all_balances.extend(user_balances)

    return all_balances

async def create_audit_log_background(target_type: str, target_id: int, user_id: int | None, action: str, changes: str | None = None):
    async with SessionLocal() as db:
        db.add(models.AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            changes=changes
        ))
        await db.commit()
