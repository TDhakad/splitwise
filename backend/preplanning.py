from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import or_, and_, func
from typing import List
from datetime import datetime

from . import models, schemas
from .database import SessionLocal
from .auth import get_current_user

router = APIRouter(prefix="/preplanning", tags=["preplanning"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helpers ---
def compute_plan_spent(db: Session, plan: models.Plan) -> dict:
    # Returns a dict with "total_spent" and "allocations_spent" map.
    # Finds all expenses linked to this plan OR matching its group/dates.
    
    # 1. Base query for expenses
    filters = []
    
    # Explicitly linked
    filters.append(models.Expense.plan_id == plan.id)
    
    # Or implicitly linked via group + date range
    group_ids = [pg.group_id for pg in plan.groups]
    if group_ids:
        filters.append(
            and_(
                models.Expense.group_id.in_(group_ids),
                models.Expense.date >= plan.start_date,
                models.Expense.date <= plan.end_date
            )
        )
        
    query = db.query(models.Expense).options(
        joinedload(models.Expense.creator),
        joinedload(models.Expense.group)
    ).filter(or_(*filters))
    expenses = query.all()
    
    # 2. Extract owner's share
    total_spent = 0
    allocations_spent = {}
    
    # To avoid double counting, track expense ids
    seen_expenses = set()
    filtered_expenses = []
    
    for expense in expenses:
        if expense.id in seen_expenses:
            continue
        seen_expenses.add(expense.id)
        
        # Find owner's participant record
        participant = next((p for p in expense.participants if p.user_id == plan.user_id), None)
        if not participant:
            continue
            
        cents_spent = round(participant.amount_owed * 100)
        total_spent += cents_spent
        
        cat = expense.category or schemas.ExpenseCategory.GENERAL.value
        if cat not in allocations_spent:
            allocations_spent[cat] = 0
        allocations_spent[cat] += cents_spent
        
        filtered_expenses.append(expense)

    return {
        "total_spent": total_spent,
        "allocations_spent": allocations_spent,
        "expenses": filtered_expenses
    }

# --- Plans ---

@router.get("/plans", response_model=List[schemas.Plan])
def list_plans(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(models.Plan).options(
        selectinload(models.Plan.groups)
    ).filter(models.Plan.user_id == current_user.id).all()
    
    result = []
    for plan in plans:
        spent_data = compute_plan_spent(db, plan)
        plan_dict = schemas.Plan.model_validate(plan).model_dump()
        plan_dict["total_spent"] = spent_data["total_spent"]
        result.append(plan_dict)
    return result

@router.post("/plans", response_model=schemas.Plan, status_code=status.HTTP_201_CREATED)
def create_plan(plan: schemas.PlanCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = models.Plan(
        user_id=current_user.id,
        name=plan.name,
        start_date=plan.start_date,
        end_date=plan.end_date,
        total_budget=plan.total_budget,
        status=plan.status,
        type=plan.type,
        group_id=plan.group_id
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/plans/{plan_id}", response_model=schemas.PlanDetail)
def get_plan(plan_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(models.Plan).options(
        selectinload(models.Plan.allocations),
        selectinload(models.Plan.predecisions),
        selectinload(models.Plan.groups).selectinload(models.PlanGroup.group)
    ).filter(models.Plan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this plan")
        
    spent_data = compute_plan_spent(db, plan)
    
    plan_dict = schemas.Plan.model_validate(plan).model_dump()
    plan_dict["allocations"] = plan.allocations
    plan_dict["predecisions"] = plan.predecisions
    plan_dict["tracked_groups"] = [pg.group for pg in plan.groups]
    plan_dict["total_spent"] = spent_data["total_spent"]
    
    # Calculate total allocated
    total_allocated = sum(a.allocated_amount for a in plan.allocations)
    plan_dict["total_allocated"] = total_allocated
    plan_dict["allocations_spent"] = spent_data["allocations_spent"]
    
    expense_dicts = []
    for e in spent_data["expenses"]:
        item = schemas.ExpenseWithCreator.model_validate(e)
        item.creator_name = e.creator.name if e.creator else None
        item.group_name = e.group.name if getattr(e, 'group', None) else None
        expense_dicts.append(item)
    
    # Sort expenses by date descending
    expense_dicts.sort(key=lambda x: x.date, reverse=True)
    plan_dict["expenses"] = expense_dicts
    
    return plan_dict

@router.patch("/plans/{plan_id}", response_model=schemas.Plan)
def update_plan(plan_id: int, plan_update: schemas.PlanUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if db_plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    update_data = plan_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plan, key, value)
        
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if db_plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db.delete(db_plan)
    db.commit()

# --- Allocations ---

@router.put("/plans/{plan_id}/allocations", response_model=List[schemas.PlanAllocation])
def update_allocations(plan_id: int, allocations: List[schemas.PlanAllocationCreate], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if db_plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Bulk replace
    db.query(models.PlanAllocation).filter(models.PlanAllocation.plan_id == plan_id).delete()
    db.flush()
    
    new_allocs = []
    for alloc in allocations:
        new_alloc = models.PlanAllocation(
            plan_id=plan_id,
            category=alloc.category.value,
            allocated_amount=alloc.allocated_amount
        )
        db.add(new_alloc)
        new_allocs.append(new_alloc)
        
    db.commit()
    for a in new_allocs:
        db.refresh(a)
    return new_allocs

@router.put("/plans/{plan_id}/groups", response_model=List[schemas.Group])
def update_plan_groups(plan_id: int, group_ids: List[int], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan or db_plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Bulk replace
    db.query(models.PlanGroup).filter(models.PlanGroup.plan_id == plan_id).delete()
    db.flush()

    for gid in group_ids:
        pg = models.PlanGroup(plan_id=plan_id, group_id=gid)
        db.add(pg)

    db.commit()
    
    plan = db.query(models.Plan).options(
        selectinload(models.Plan.groups).selectinload(models.PlanGroup.group)
    ).filter(models.Plan.id == plan_id).first()

    return [pg.group for pg in plan.groups]

# --- Predecisions ---

@router.post("/plans/{plan_id}/predecisions", response_model=schemas.PlanPredecision, status_code=status.HTTP_201_CREATED)
def create_predecision(plan_id: int, predecision: schemas.PlanPredecisionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if db_plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_pred = models.PlanPredecision(
        plan_id=plan_id,
        title=predecision.title,
        category=predecision.category.value,
        expected_amount=predecision.expected_amount,
        status=predecision.status
    )
    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)
    return db_pred

@router.patch("/plans/{plan_id}/predecisions/{pred_id}", response_model=schemas.PlanPredecision)
def update_predecision(plan_id: int, pred_id: int, predecision: schemas.PlanPredecisionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan or db_plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    db_pred = db.query(models.PlanPredecision).filter(
        models.PlanPredecision.id == pred_id,
        models.PlanPredecision.plan_id == plan_id
    ).first()
    if not db_pred:
        raise HTTPException(status_code=404, detail="Predecision not found")
        
    db_pred.title = predecision.title
    db_pred.category = predecision.category.value
    db_pred.expected_amount = predecision.expected_amount
    db_pred.status = predecision.status
    
    db.commit()
    db.refresh(db_pred)
    return db_pred

@router.delete("/plans/{plan_id}/predecisions/{pred_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_predecision(plan_id: int, pred_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if not db_plan or db_plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    db_pred = db.query(models.PlanPredecision).filter(
        models.PlanPredecision.id == pred_id,
        models.PlanPredecision.plan_id == plan_id
    ).first()
    if not db_pred:
        raise HTTPException(status_code=404, detail="Predecision not found")
        
    db.delete(db_pred)
    db.commit()
