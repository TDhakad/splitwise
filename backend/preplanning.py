from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from . import models, schemas
from .auth import get_current_user
from .database import get_db
from .datetime_utils import as_naive_utc
from .dependencies import bounded_limit, require_plan_owner, validate_user_group_ids

router = APIRouter(prefix="/preplanning", tags=["preplanning"])


async def compute_plan_spent(db: AsyncSession, plan: models.Plan) -> dict:
    filters = [models.Expense.plan_id == plan.id]
    group_ids = [plan_group.group_id for plan_group in plan.groups]
    if group_ids:
        filters.append(
            and_(
                models.Expense.group_id.in_(group_ids),
                models.Expense.date >= plan.start_date,
                models.Expense.date <= plan.end_date,
            )
        )

    expenses_result = await db.execute(
        select(models.Expense)
        .options(
            selectinload(models.Expense.participants),
            joinedload(models.Expense.creator),
            joinedload(models.Expense.group),
        )
        .where(or_(*filters), models.Expense.is_deleted == False)
    )
    expenses = expenses_result.scalars().unique().all()

    total_spent = 0
    allocations_spent = {}
    seen_expenses = set()
    filtered_expenses = []

    for expense in expenses:
        if expense.id in seen_expenses:
            continue
        seen_expenses.add(expense.id)

        participant = next((p for p in expense.participants if p.user_id == plan.user_id), None)
        if not participant:
            continue

        cents_spent = round(participant.amount_owed * 100)
        total_spent += cents_spent

        category = expense.category or schemas.ExpenseCategory.GENERAL.value
        allocations_spent[category] = allocations_spent.get(category, 0) + cents_spent
        filtered_expenses.append(expense)

    return {
        "total_spent": total_spent,
        "allocations_spent": allocations_spent,
        "expenses": filtered_expenses,
    }


async def get_plan_with_details(db: AsyncSession, plan_id: int) -> models.Plan | None:
    result = await db.execute(
        select(models.Plan)
        .options(
            selectinload(models.Plan.allocations),
            selectinload(models.Plan.predecisions),
            selectinload(models.Plan.groups).selectinload(models.PlanGroup.group),
        )
        .where(models.Plan.id == plan_id)
    )
    return result.scalar_one_or_none()


@router.get("/plans", response_model=list[schemas.Plan])
async def list_plans(
    skip: int = 0,
    limit: int = Depends(bounded_limit),
    status: str | None = None,
    type: str | None = None,
    group_id: int | None = None,
    search: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [models.Plan.user_id == current_user.id]
    if status:
        filters.append(models.Plan.status == status)
    if type:
        filters.append(models.Plan.type == type)
    if group_id is not None:
        filters.append(models.Plan.group_id == group_id)
    if search:
        filters.append(models.Plan.name.ilike(f"%{search}%"))

    plans_result = await db.execute(
        select(models.Plan)
        .options(selectinload(models.Plan.groups))
        .where(*filters)
        .offset(skip)
        .limit(limit)
    )

    result = []
    for plan in plans_result.scalars().all():
        spent_data = await compute_plan_spent(db, plan)
        plan_dict = schemas.Plan.model_validate(plan).model_dump()
        plan_dict["total_spent"] = spent_data["total_spent"]
        result.append(plan_dict)
    return result


@router.post("/plans", response_model=schemas.Plan, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan: schemas.PlanCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if plan.group_id is not None:
        await validate_user_group_ids(db, [plan.group_id], current_user.id)

    db_plan = models.Plan(
        user_id=current_user.id,
        name=plan.name,
        start_date=as_naive_utc(plan.start_date),
        end_date=as_naive_utc(plan.end_date),
        total_budget=plan.total_budget,
        status=plan.status,
        type=plan.type,
        group_id=plan.group_id,
    )
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan


@router.get("/plans/{plan_id}", response_model=schemas.PlanDetail)
async def get_plan(
    plan_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await get_plan_with_details(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this plan")

    spent_data = await compute_plan_spent(db, plan)
    plan_dict = schemas.Plan.model_validate(plan).model_dump()
    plan_dict["allocations"] = plan.allocations
    plan_dict["predecisions"] = plan.predecisions
    plan_dict["tracked_groups"] = [plan_group.group for plan_group in plan.groups]
    plan_dict["total_spent"] = spent_data["total_spent"]
    plan_dict["total_allocated"] = sum(allocation.allocated_amount for allocation in plan.allocations)
    plan_dict["allocations_spent"] = spent_data["allocations_spent"]

    expense_dicts = []
    for expense in spent_data["expenses"]:
        item = schemas.ExpenseWithCreator.model_validate(expense)
        item.creator_name = expense.creator.name if expense.creator else None
        item.group_name = expense.group.name if expense.group else None
        expense_dicts.append(item)

    expense_dicts.sort(key=lambda item: item.date, reverse=True)
    plan_dict["expenses"] = expense_dicts
    return plan_dict


@router.patch("/plans/{plan_id}", response_model=schemas.Plan)
async def update_plan(
    plan_id: int,
    plan_update: schemas.PlanUpdate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_plan = await require_plan_owner(db, plan_id, current_user.id)
    update_data = plan_update.model_dump(exclude_unset=True)
    if "group_id" in update_data and update_data["group_id"] is not None:
        await validate_user_group_ids(db, [update_data["group_id"]], current_user.id)
    for field in ["start_date", "end_date"]:
        if field in update_data:
            update_data[field] = as_naive_utc(update_data[field])

    for key, value in update_data.items():
        setattr(db_plan, key, value)

    await db.commit()
    await db.refresh(db_plan)
    return db_plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_plan = await require_plan_owner(db, plan_id, current_user.id)
    await db.delete(db_plan)
    await db.commit()


@router.put("/plans/{plan_id}/allocations", response_model=list[schemas.PlanAllocation])
async def update_allocations(
    plan_id: int,
    allocations: list[schemas.PlanAllocationCreate],
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_plan_owner(db, plan_id, current_user.id)
    existing_result = await db.execute(
        select(models.PlanAllocation).where(models.PlanAllocation.plan_id == plan_id)
    )
    for allocation in existing_result.scalars().all():
        await db.delete(allocation)
    await db.flush()

    new_allocations = []
    for allocation in allocations:
        new_allocation = models.PlanAllocation(
            plan_id=plan_id,
            category=allocation.category.value,
            allocated_amount=allocation.allocated_amount,
        )
        db.add(new_allocation)
        new_allocations.append(new_allocation)

    await db.commit()
    for allocation in new_allocations:
        await db.refresh(allocation)
    return new_allocations


@router.put("/plans/{plan_id}/groups", response_model=list[schemas.Group])
async def update_plan_groups(
    plan_id: int,
    group_ids: list[int],
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_plan_owner(db, plan_id, current_user.id)
    await validate_user_group_ids(db, group_ids, current_user.id)

    existing_result = await db.execute(select(models.PlanGroup).where(models.PlanGroup.plan_id == plan_id))
    for plan_group in existing_result.scalars().all():
        await db.delete(plan_group)
    await db.flush()

    for group_id in group_ids:
        db.add(models.PlanGroup(plan_id=plan_id, group_id=group_id))

    await db.commit()

    plan = await get_plan_with_details(db, plan_id)
    return [plan_group.group for plan_group in plan.groups]


@router.post("/plans/{plan_id}/predecisions", response_model=schemas.PlanPredecision, status_code=status.HTTP_201_CREATED)
async def create_predecision(
    plan_id: int,
    predecision: schemas.PlanPredecisionCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_plan_owner(db, plan_id, current_user.id)
    db_pred = models.PlanPredecision(
        plan_id=plan_id,
        title=predecision.title,
        category=predecision.category.value,
        expected_amount=predecision.expected_amount,
        status=predecision.status,
    )
    db.add(db_pred)
    await db.commit()
    await db.refresh(db_pred)
    return db_pred


@router.patch("/plans/{plan_id}/predecisions/{pred_id}", response_model=schemas.PlanPredecision)
async def update_predecision(
    plan_id: int,
    pred_id: int,
    predecision: schemas.PlanPredecisionCreate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_plan_owner(db, plan_id, current_user.id)
    pred_result = await db.execute(
        select(models.PlanPredecision).where(
            models.PlanPredecision.id == pred_id,
            models.PlanPredecision.plan_id == plan_id,
        )
    )
    db_pred = pred_result.scalar_one_or_none()
    if not db_pred:
        raise HTTPException(status_code=404, detail="Predecision not found")

    db_pred.title = predecision.title
    db_pred.category = predecision.category.value
    db_pred.expected_amount = predecision.expected_amount
    db_pred.status = predecision.status

    await db.commit()
    await db.refresh(db_pred)
    return db_pred


@router.delete("/plans/{plan_id}/predecisions/{pred_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_predecision(
    plan_id: int,
    pred_id: int,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_plan_owner(db, plan_id, current_user.id)
    pred_result = await db.execute(
        select(models.PlanPredecision).where(
            models.PlanPredecision.id == pred_id,
            models.PlanPredecision.plan_id == plan_id,
        )
    )
    db_pred = pred_result.scalar_one_or_none()
    if not db_pred:
        raise HTTPException(status_code=404, detail="Predecision not found")

    await db.delete(db_pred)
    await db.commit()
