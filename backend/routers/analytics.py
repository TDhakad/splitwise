from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models
from ..auth import get_current_user
from ..database import get_db
from ..datetime_utils import as_naive_utc
from ..services import to_cents

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/spending")
async def get_spending_analytics(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    group_id: int | None = None,
    plan_id: int | None = None,
    category: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        models.ExpenseParticipant.user_id == current_user.id,
        models.Expense.is_deleted == False,
    ]
    if start_date is not None:
        filters.append(models.Expense.date >= as_naive_utc(start_date))
    if end_date is not None:
        filters.append(models.Expense.date <= as_naive_utc(end_date))
    if group_id is not None:
        filters.append(models.Expense.group_id == group_id)
    if plan_id is not None:
        filters.append(models.Expense.plan_id == plan_id)
    if category:
        filters.append(models.Expense.category == category)

    result = await db.execute(
        select(
            models.Expense.date,
            models.Expense.category,
            models.ExpenseParticipant.amount_owed,
        )
        .join(models.Expense, models.Expense.id == models.ExpenseParticipant.expense_id)
        .where(*filters)
        .order_by(models.Expense.date.asc())
    )
    rows = result.all()

    monthly: dict[str, int] = {}
    categories: dict[str, int] = {}
    total_cents = 0
    for spent_at, expense_category, amount_owed in rows:
        month_key = spent_at.strftime("%Y-%m")
        cents = to_cents(amount_owed)
        monthly[month_key] = monthly.get(month_key, 0) + cents
        category_key = expense_category or "General"
        categories[category_key] = categories.get(category_key, 0) + cents
        total_cents += cents

    sorted_categories = sorted(categories.items(), key=lambda item: item[1], reverse=True)
    month_count = max(len(monthly), 1)
    transaction_count = len(rows)

    return {
        "monthly": [{"month": month, "amount_cents": amount} for month, amount in sorted(monthly.items())],
        "categories": [{"category": name, "amount_cents": amount} for name, amount in sorted_categories],
        "habits": {
            "total_cents": total_cents,
            "average_monthly_cents": round(total_cents / month_count),
            "transaction_count": transaction_count,
            "average_transaction_cents": round(total_cents / transaction_count) if transaction_count else 0,
            "top_category": sorted_categories[0][0] if sorted_categories else None,
        },
    }
