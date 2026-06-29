from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from .. import models
from ..auth import get_current_user
from ..database import get_db
from ..datetime_utils import as_naive_utc
from ..services import compute_balances_for_user, to_cents

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


AGING_BUCKETS = [("0-7", 0, 7), ("8-30", 8, 30), ("31-90", 31, 90), ("90+", 91, None)]


@router.get("/groups")
async def get_group_analytics(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    
    # Get groups user is a member of
    groups_result = await db.execute(
        select(models.Group.id, models.Group.name)
        .join(models.GroupMember)
        .where(models.GroupMember.user_id == user_id)
    )
    groups = {g_id: g_name for g_id, g_name in groups_result.all()}
    
    group_stats = []
    
    for group_id, group_name in groups.items():
        # Activity metrics
        expense_count_result = await db.execute(
            select(func.count(models.Expense.id))
            .where(models.Expense.group_id == group_id, models.Expense.is_deleted == False)
        )
        expense_count = expense_count_result.scalar_one() or 0
        
        # Settlement velocity (avg days from expense to settlement)
        settlement_velocity_result = await db.execute(
            select(func.avg(
                func.extract('epoch', models.Settlement.date - models.Expense.date) / 86400
            ))
            .join(models.ExpenseParticipant, models.ExpenseParticipant.expense_id == models.Expense.id)
            .join(models.Settlement, and_(
                or_(
                    and_(models.Settlement.payer_id == models.ExpenseParticipant.user_id, models.Settlement.payee_id != models.ExpenseParticipant.user_id),
                    and_(models.Settlement.payee_id == models.ExpenseParticipant.user_id, models.Settlement.payer_id != models.ExpenseParticipant.user_id)
                ),
                models.Settlement.group_id == group_id,
                models.Settlement.date >= models.Expense.date
            ))
            .where(models.Expense.group_id == group_id, models.Expense.is_deleted == False)
        )
        avg_settlement_days = settlement_velocity_result.scalar_one_or_none() or 0
        
        # Balance fairness (standard deviation of net positions)
        balances = await compute_balances_for_group(db, group_id)
        member_nets = {}
        for balance in balances:
            member_nets[balance["from_user_id"]] = member_nets.get(balance["from_user_id"], 0) - balance["amount"]
            member_nets[balance["to_user_id"]] = member_nets.get(balance["to_user_id"], 0) + balance["amount"]
        
        if member_nets:
            amounts = list(member_nets.values())
            mean_net = sum(amounts) / len(amounts)
            variance = sum((x - mean_net) ** 2 for x in amounts) / len(amounts)
            balance_fairness = 100 - min(100, variance ** 0.5)  # Lower std dev = higher fairness
        else:
            balance_fairness = 100
            
        group_stats.append({
            "group_id": group_id,
            "name": group_name,
            "expense_count": expense_count,
            "avg_settlement_days": round(avg_settlement_days, 1),
            "balance_fairness_score": round(balance_fairness, 1),
        })
    
    return {"groups": group_stats}


@router.get("/predictions")
async def get_prediction_analytics(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    
    # Get current balances
    balances = await compute_balances_for_user(db, user_id)
    predictions = []
    
    for balance in balances:
        if balance["amount"] <= 0.01:
            continue
            
        counterparty_id = balance["to_user_id"] if balance["from_user_id"] == user_id else balance["from_user_id"]
        
        # Historical settlement speed for this person
        historical_speed = await db.execute(
            select(func.avg(
                func.extract('epoch', models.Settlement.date - models.Expense.date) / 86400
            ))
            .join(models.ExpenseParticipant, models.ExpenseParticipant.expense_id == models.Expense.id)
            .join(models.Settlement, and_(
                or_(
                    and_(models.Settlement.payer_id == counterparty_id, models.Settlement.payee_id == user_id),
                    and_(models.Settlement.payee_id == counterparty_id, models.Settlement.payer_id == user_id)
                ),
                models.Settlement.date >= models.Expense.date
            ))
            .where(models.Expense.is_deleted == False)
        )
        avg_days = historical_speed.scalar_one_or_none() or 14  # Default to 2 weeks
        
        # Simple reliability score based on settlement history
        prompt_settlements = await db.execute(
            select(func.count())
            .select_from(models.Settlement)
            .join(models.ExpenseParticipant, models.ExpenseParticipant.expense_id.in_(
                select(models.Expense.id).where(
                    models.Settlement.date - models.Expense.date <= func.make_interval(0, 0, 0, 7)  # Within 7 days
                )
            ))
            .where(
                or_(models.Settlement.payer_id == counterparty_id, models.Settlement.payee_id == counterparty_id),
                models.Settlement.payer_id != models.Settlement.payee_id
            )
        )
        total_settlements = await db.execute(
            select(func.count())
            .select_from(models.Settlement)
            .where(
                or_(models.Settlement.payer_id == counterparty_id, models.Settlement.payee_id == counterparty_id),
                models.Settlement.payer_id != models.Settlement.payee_id
            )
        )
        
        prompt_count = prompt_settlements.scalar_one() or 0
        total_count = total_settlements.scalar_one() or 1
        reliability_score = round((prompt_count / total_count) * 100, 1)
        
        predictions.append({
            "counterparty_id": counterparty_id,
            "group_id": balance["group_id"],
            "amount_cents": to_cents(balance["amount"]),
            "direction": "receivable" if balance["to_user_id"] == user_id else "payable",
            "predicted_settlement_days": round(avg_days, 1),
            "reliability_score": reliability_score,
        })
    
    return {"predictions": predictions}


@router.get("/shopping-insights")
async def get_shopping_insights(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    
    rows = await db.execute(
        select(models.Expense.receipt_breakdown, models.Expense.date)
        .join(models.ExpenseParticipant)
        .where(
            models.ExpenseParticipant.user_id == user_id,
            models.Expense.is_deleted == False,
            models.Expense.receipt_breakdown.isnot(None),
        )
        .order_by(models.Expense.date.desc())
    )
    
    brand_spending = {}
    category_patterns = {}
    monthly_volume = {}
    
    for breakdown, expense_date in rows.all():
        if not breakdown:
            continue
            
        month_key = expense_date.strftime("%Y-%m")
        monthly_volume[month_key] = monthly_volume.get(month_key, 0) + 1
        
        for item in breakdown.get("items", []):
            share = next((s for s in item.get("shares", []) if s.get("user_id") == user_id), None)
            if not share or share.get("amount", 0) <= 0:
                continue
                
            name = item.get("name", "").lower()
            amount_cents = to_cents(share["amount"])
            
            # Brand detection (simple keyword matching)
            brands = ["coca-cola", "pepsi", "starbucks", "mcdonald", "walmart", "target", "whole foods"]
            detected_brand = next((brand for brand in brands if brand in name), "other")
            brand_spending[detected_brand] = brand_spending.get(detected_brand, 0) + amount_cents
            
            # Category inference from item name
            if any(word in name for word in ["milk", "bread", "egg", "butter", "cheese"]):
                category = "staples"
            elif any(word in name for word in ["apple", "banana", "orange", "vegetable", "fruit"]):
                category = "produce"
            elif any(word in name for word in ["beer", "wine", "soda", "juice"]):
                category = "beverages"
            elif any(word in name for word in ["snack", "chip", "cookie", "candy"]):
                category = "snacks"
            else:
                category = "other"
                
            category_patterns[category] = category_patterns.get(category, 0) + amount_cents
    
    top_brands = sorted(brand_spending.items(), key=lambda x: x[1], reverse=True)[:5]
    top_categories = sorted(category_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "brand_preferences": [{"brand": brand, "amount_cents": cents} for brand, cents in top_brands],
        "shopping_categories": [{"category": cat, "amount_cents": cents} for cat, cents in top_categories],
        "monthly_receipt_volume": [{"month": month, "receipt_count": count} for month, count in sorted(monthly_volume.items())],
    }


@router.get("/standing")
async def get_standing_analytics(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id

    monthly_deltas: dict[str, int] = {}

    participant_rows = await db.execute(
        select(
            models.Expense.date,
            models.ExpenseParticipant.amount_paid,
            models.ExpenseParticipant.amount_owed,
        )
        .join(models.Expense, models.Expense.id == models.ExpenseParticipant.expense_id)
        .where(models.ExpenseParticipant.user_id == user_id, models.Expense.is_deleted == False)
    )
    for spent_at, amount_paid, amount_owed in participant_rows.all():
        month_key = spent_at.strftime("%Y-%m")
        monthly_deltas[month_key] = monthly_deltas.get(month_key, 0) + to_cents((amount_paid or 0) - (amount_owed or 0))

    settlement_rows = await db.execute(
        select(
            models.Settlement.date,
            models.Settlement.amount,
            models.Settlement.payer_id,
        ).where(or_(models.Settlement.payer_id == user_id, models.Settlement.payee_id == user_id))
    )
    for settled_at, amount, payer_id in settlement_rows.all():
        month_key = settled_at.strftime("%Y-%m")
        signed = to_cents(amount) if payer_id == user_id else -to_cents(amount)
        monthly_deltas[month_key] = monthly_deltas.get(month_key, 0) + signed

    net_history = []
    running = 0
    for month_key in sorted(monthly_deltas.keys()):
        running += monthly_deltas[month_key]
        net_history.append({"month": month_key, "net_cents": running})

    balances = await compute_balances_for_user(db, user_id)
    now = as_naive_utc(datetime.now(timezone.utc))
    bucket_map = {label: {"label": label, "receivable_cents": 0, "payable_cents": 0} for label, _, _ in AGING_BUCKETS}
    items = []

    for balance in balances:
        if balance["amount"] <= 0.01:
            continue
        if balance["to_user_id"] == user_id:
            direction = "receivable"
            counterparty = balance["from_user_id"]
        else:
            direction = "payable"
            counterparty = balance["to_user_id"]
        group_id = balance["group_id"]

        # Age the balance from the last time the pair squared up, or the first
        # shared expense if they never have.
        last_settlement = await db.execute(
            select(func.max(models.Settlement.date)).where(
                models.Settlement.group_id == group_id,
                or_(
                    and_(models.Settlement.payer_id == user_id, models.Settlement.payee_id == counterparty),
                    and_(models.Settlement.payer_id == counterparty, models.Settlement.payee_id == user_id),
                ),
            )
        )
        anchor = last_settlement.scalar_one_or_none()
        if anchor is None:
            payer = aliased(models.ExpenseParticipant)
            other = aliased(models.ExpenseParticipant)
            earliest = await db.execute(
                select(func.min(models.Expense.date))
                .join(payer, payer.expense_id == models.Expense.id)
                .join(other, other.expense_id == models.Expense.id)
                .where(
                    payer.user_id == user_id,
                    other.user_id == counterparty,
                    models.Expense.group_id == group_id,
                    models.Expense.is_deleted == False,
                )
            )
            anchor = earliest.scalar_one_or_none()

        anchor = as_naive_utc(anchor) if anchor else now
        age_days = max((now - anchor).days, 0)
        amount_cents = to_cents(balance["amount"])

        for label, low, high in AGING_BUCKETS:
            if age_days >= low and (high is None or age_days <= high):
                bucket_map[label][f"{direction}_cents"] += amount_cents
                break

        items.append({
            "counterparty_id": counterparty,
            "group_id": group_id,
            "amount_cents": amount_cents,
            "direction": direction,
            "age_days": age_days,
        })

    items.sort(key=lambda item: item["age_days"], reverse=True)

    return {
        "net_history": net_history,
        "aging": {
            "buckets": [bucket_map[label] for label, _, _ in AGING_BUCKETS],
            "items": items,
        },
    }


@router.get("/receipt-items")
async def get_receipt_item_analytics(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id

    rows = await db.execute(
        select(models.Expense.receipt_breakdown)
        .join(models.ExpenseParticipant, models.ExpenseParticipant.expense_id == models.Expense.id)
        .where(
            models.ExpenseParticipant.user_id == user_id,
            models.Expense.is_deleted == False,
            models.Expense.receipt_breakdown.isnot(None),
        )
    )

    aggregated: dict[str, dict] = {}
    total_cents = 0
    purchase_count = 0

    for (breakdown,) in rows.all():
        if not breakdown:
            continue
        for item in breakdown.get("items", []):
            share = next((s for s in item.get("shares", []) if s.get("user_id") == user_id), None)
            if not share:
                continue
            amount = share.get("amount") or 0
            if amount <= 0:
                continue
            cents = to_cents(amount)
            name = item.get("name", "Item")
            entry = aggregated.setdefault(name, {"name": name, "count": 0, "amount_cents": 0})
            entry["count"] += 1
            entry["amount_cents"] += cents
            total_cents += cents
            purchase_count += 1

    top_items = sorted(aggregated.values(), key=lambda entry: entry["amount_cents"], reverse=True)[:10]

    return {
        "total_spent_cents": total_cents,
        "purchase_count": purchase_count,
        "top_items": top_items,
    }


@router.get("/cashflow")
async def get_cashflow_forecast(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id
    now = as_naive_utc(datetime.now(timezone.utc))
    
    # Get current outstanding balances
    balances = await compute_balances_for_user(db, user_id)
    
    # Calculate expected incoming (people owe you)
    expected_incoming = sum(b["amount"] for b in balances if b["to_user_id"] == user_id)
    
    # Calculate expected outgoing (you owe people)  
    expected_outgoing = sum(b["amount"] for b in balances if b["from_user_id"] == user_id)
    
    # Historical monthly spending pattern for forecasting
    six_months_ago = datetime(now.year, now.month, 1) - func.make_interval(0, 6)
    monthly_spending = await db.execute(
        select(
            func.date_trunc('month', models.Expense.date).label('month'),
            func.sum(models.ExpenseParticipant.amount_owed).label('spent')
        )
        .join(models.ExpenseParticipant)
        .where(
            models.ExpenseParticipant.user_id == user_id,
            models.Expense.is_deleted == False,
            models.Expense.date >= six_months_ago
        )
        .group_by(func.date_trunc('month', models.Expense.date))
        .order_by('month')
    )
    
    monthly_amounts = [float(spent) for _, spent in monthly_spending.all()]
    avg_monthly_spend = sum(monthly_amounts) / len(monthly_amounts) if monthly_amounts else 0
    
    # Settlement timing patterns for incoming cash prediction
    settlement_patterns = await db.execute(
        select(
            func.extract('epoch', models.Settlement.date - models.Expense.date) / 86400
        )
        .join(models.ExpenseParticipant, models.ExpenseParticipant.expense_id == models.Expense.id)
        .join(models.Settlement, and_(
            models.Settlement.payee_id == user_id,
            models.Settlement.date >= models.Expense.date
        ))
        .where(models.Expense.is_deleted == False)
        .limit(50)  # Recent settlements
    )
    
    settlement_delays = [float(delay) for (delay,) in settlement_patterns.all()]
    avg_settlement_delay = sum(settlement_delays) / len(settlement_delays) if settlement_delays else 14
    
    # Forecast next 3 months
    forecasts = []
    base_date = datetime(now.year, now.month, 1)
    
    for i in range(3):
        month_start = base_date.replace(month=base_date.month + i) if base_date.month + i <= 12 else base_date.replace(year=base_date.year + 1, month=base_date.month + i - 12)
        
        # Estimated incoming (portion of current balances expected to settle)
        settlement_probability = max(0.1, 1 - (i * 0.3))  # Decreasing likelihood over time
        estimated_incoming = expected_incoming * settlement_probability / 3  # Spread over 3 months
        
        # Estimated outgoing (your spending + settling debts)
        estimated_spending = avg_monthly_spend
        estimated_settlements = expected_outgoing * settlement_probability / 3
        
        forecasts.append({
            "month": month_start.strftime("%Y-%m"),
            "estimated_incoming_cents": to_cents(estimated_incoming),
            "estimated_outgoing_cents": to_cents(estimated_spending + estimated_settlements),
            "net_flow_cents": to_cents(estimated_incoming - estimated_spending - estimated_settlements),
        })
    
    return {
        "current_receivables_cents": to_cents(expected_incoming),
        "current_payables_cents": to_cents(expected_outgoing), 
        "avg_monthly_spend_cents": to_cents(avg_monthly_spend),
        "avg_settlement_delay_days": round(avg_settlement_delay, 1),
        "monthly_forecasts": forecasts,
    }