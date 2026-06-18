from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text
from typing import List
import datetime
import asyncio
import base64
import os
import fitz
from collections import defaultdict
import json
from sqlalchemy import event
from fastapi.encoders import jsonable_encoder

from . import models, schemas
from .database import SessionLocal, engine
from .auth import get_password_hash, verify_password, create_access_token, verify_google_token, get_current_user
from .storage import LocalStorage
from .util import process_receipt_image

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Splitwise Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
from .storage import LocalStorage, FirebaseStorage
import os

firebase_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
if firebase_bucket:
    storage_backend = FirebaseStorage(firebase_bucket)
else:
    storage_backend = LocalStorage("uploads")



@app.post("/receipts/scan")
async def scan_receipt(file: UploadFile = File(...)):
    import tempfile
    import os
    from io import BytesIO
    
    file_bytes = await file.read()
    
    # If PDF, convert first page to image
    if file.filename.lower().endswith('.pdf') or file.content_type == 'application/pdf':
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_bytes)
            temp_pdf_path = temp_pdf.name
            
        doc = fitz.open(temp_pdf_path)
        page = doc.load_page(0)  # load first page
        pix = page.get_pixmap()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_png:
            pix.save(temp_png.name)
            with open(temp_png.name, "rb") as f:
                img_bytes = f.read()
                
        # Cleanup
        os.remove(temp_pdf_path)
        os.remove(temp_png.name)
        
        # Override file object with PNG for upload using a simple mock class
        class ProcessedFile:
            def __init__(self, filename, file_obj, content_type):
                self.filename = filename
                self.file = file_obj
                self.content_type = content_type

        file = ProcessedFile(
            file.filename.rsplit('.', 1)[0] + '.png',
            BytesIO(img_bytes),
            'image/png'
        )
        file_bytes = img_bytes
    else:
        file.file.seek(0)
        
    # Save the file (works for both local and GCS)
    file_url = storage_backend.save(file)
    
    # Process for base64
    base64_image = base64.b64encode(file_bytes).decode("utf-8")
        
    try:
        parsed_receipt = process_receipt_image(base64_image)
        return {
            "image_url": file_url,
            "data": parsed_receipt.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Auth ---

@app.post("/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password) if user.password else None
    
    db_user = models.User(
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        hashed_password=hashed_password,
        auth_provider=user.auth_provider,
        auth_provider_id=user.auth_provider_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/google", response_model=schemas.Token)
def google_auth(auth_req: schemas.GoogleAuthRequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(auth_req.token)
    if not idinfo:
        raise HTTPException(status_code=400, detail="Invalid Google token")
        
    email = idinfo.get("email")
    name = idinfo.get("name")
    avatar_url = idinfo.get("picture")
    google_id = idinfo.get("sub")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            auth_provider="google",
            auth_provider_id=google_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- SSE Events ---

clients = []
main_loop = None

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()

@app.get("/events")
async def sse_events():
    queue = asyncio.Queue()
    clients.append(queue)
    async def event_generator():
        try:
            while True:
                msg = await queue.get()
                yield f"data: {msg}\n\n"
        except asyncio.CancelledError:
            if queue in clients:
                clients.remove(queue)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

def notify_clients():
    if main_loop:
        for q in clients:
            main_loop.call_soon_threadsafe(q.put_nowait, "update")

# --- Users ---

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(email=user.email, name=user.name, avatar_url=user.avatar_url)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only return users who have an ACCEPTED friendship with current_user
    friendships = db.query(models.Friendship).filter(
        and_(
            or_(models.Friendship.requester_id == current_user.id, models.Friendship.addressee_id == current_user.id),
            models.Friendship.status == "ACCEPTED"
        )
    ).all()
    
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f.requester_id if f.requester_id != current_user.id else f.addressee_id)
        
    users = db.query(models.User).filter(models.User.id.in_(friend_ids)).offset(skip).limit(limit).all()
    return users

# --- Friends ---

@app.post("/friends/request", response_model=schemas.Friendship)
def send_friend_request(request: schemas.FriendshipCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if request.email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")
        
    addressee = db.query(models.User).filter(models.User.email == request.email).first()
    if not addressee:
        raise HTTPException(status_code=404, detail="User not found with that email")
        
    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.requester_id == current_user.id, models.Friendship.addressee_id == addressee.id),
            and_(models.Friendship.requester_id == addressee.id, models.Friendship.addressee_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status in ["REMOVED", "REJECTED"]:
            existing.status = "PENDING"
            existing.requester_id = current_user.id
            existing.addressee_id = addressee.id
            existing.updated_at = datetime.datetime.utcnow()
            db.commit()
            db.refresh(existing)
            notify_clients()
            return existing
        else:
            raise HTTPException(status_code=400, detail=f"Friendship already exists with status: {existing.status}")
            
    new_request = models.Friendship(
        requester_id=current_user.id,
        addressee_id=addressee.id,
        status="PENDING"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    notify_clients()
    return new_request

@app.put("/friends/request/{id}", response_model=schemas.Friendship)
def update_friend_request(id: int, status: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(models.Friendship).filter(models.Friendship.id == id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if status not in ["ACCEPTED", "REJECTED", "REMOVED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    if status in ["ACCEPTED", "REJECTED"]:
        if friendship.addressee_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to accept/reject this request")
            
    if status == "REMOVED":
        if current_user.id not in [friendship.requester_id, friendship.addressee_id]:
            raise HTTPException(status_code=403, detail="Not authorized to remove this friendship")
            
    friendship.status = status
    friendship.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(friendship)
    notify_clients()
    return friendship

@app.get("/friends/requests", response_model=List[schemas.FriendshipWithUsers])
def get_friend_requests(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = db.query(models.Friendship).filter(
        and_(
            or_(models.Friendship.requester_id == current_user.id, models.Friendship.addressee_id == current_user.id),
            models.Friendship.status == "PENDING"
        )
    ).all()
    return requests

# --- Groups ---

@app.post("/groups/", response_model=schemas.Group)
def create_group(group: schemas.GroupCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_group = models.Group(**group.model_dump(), created_by=current_user.id)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add creator as a member
    member = models.GroupMember(group_id=db_group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return db_group

@app.get("/groups/", response_model=List[schemas.Group])
def read_groups(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only return groups the user is a member of
    groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return groups

@app.get("/groups/{group_id}", response_model=schemas.GroupDetail)
def read_group(group_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Check membership
    member_ids = [gm.user_id for gm in group.members]
    if current_user.id not in member_ids:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")
        
    members = [gm.user for gm in group.members]
    return {"id": group.id, "name": group.name, "description": group.description,
            "simplify_debts": group.simplify_debts,
            "created_by": group.created_by, "created_at": group.created_at, "members": members}

@app.get("/groups/{group_id}/expenses", response_model=List[schemas.ExpenseWithCreator])
def read_group_expenses(group_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group or current_user.id not in [gm.user_id for gm in group.members]:
        raise HTTPException(status_code=403, detail="Not authorized to view this group's expenses")
        
    expenses = db.query(models.Expense).filter(models.Expense.group_id == group_id).order_by(models.Expense.date.desc()).all()
    result = []
    for e in expenses:
        item = schemas.ExpenseWithCreator.model_validate(e)
        item.creator_name = e.creator.name if e.creator else None
        result.append(item)
    return result

@app.get("/groups/{group_id}/balances", response_model=List[schemas.BalanceSummary])
def read_group_balances(group_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group or current_user.id not in [gm.user_id for gm in group.members]:
        raise HTTPException(status_code=403, detail="Not authorized to view this group's balances")
        
    balances = db.query(models.Balance).filter(models.Balance.group_id == group_id).all()
    return balances

@app.post("/groups/{group_id}/members/{user_id}")
def add_group_member(group_id: int, user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group or current_user.id not in [gm.user_id for gm in group.members]:
        raise HTTPException(status_code=403, detail="Not authorized to manage this group")
        
    # Check if user already exists
    if user_id in [gm.user_id for gm in group.members]:
        return {"status": "success"} # Already member
        
    member = models.GroupMember(group_id=group_id, user_id=user_id)
    db.add(member)
    db.commit()
    return {"status": "success"}

@app.put("/groups/{group_id}/simplify")
def toggle_simplify_debts(group_id: int, enable: bool, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group or current_user.id not in [gm.user_id for gm in group.members]:
        raise HTTPException(status_code=403, detail="Not authorized to manage this group")
        
    group.simplify_debts = enable
    db.commit()
    rebuild_balances(group_id, db)
    notify_clients()
    return {"status": "success", "simplify_debts": enable}

# --- Expenses & Balances ---

def rebuild_balances(group_id, db: Session):
    db.query(models.Balance).filter(models.Balance.group_id == group_id).delete()
    db.flush()

    expenses = db.query(models.Expense).filter(models.Expense.group_id == group_id).all()
    settlements = db.query(models.Settlement).filter(models.Settlement.group_id == group_id).all()
    
    group = None
    if group_id is not None:
        group = db.query(models.Group).get(group_id)

    simplify_debts = group.simplify_debts if group else True

    if simplify_debts:
        nets = defaultdict(float)
        for exp in expenses:
            for p in exp.participants:
                nets[p.user_id] += (p.amount_paid - p.amount_owed)
        for stl in settlements:
            nets[stl.payer_id] += stl.amount
            nets[stl.payee_id] -= stl.amount
            
        creditors = {u: amt for u, amt in nets.items() if amt > 0.01}
        debtors = {u: -amt for u, amt in nets.items() if amt < -0.01}
        
        for d_id, d_amt in debtors.items():
            for c_id, c_amt in list(creditors.items()):
                if d_amt <= 0.01: break
                if c_amt <= 0.01: continue
                settle = min(d_amt, c_amt)
                d_amt -= settle
                creditors[c_id] -= settle
                
                db.add(models.Balance(group_id=group_id, from_user_id=d_id, to_user_id=c_id, amount=settle))
    else:
        pairwise = defaultdict(lambda: defaultdict(float))
        for exp in expenses:
            exp_nets = defaultdict(float)
            for p in exp.participants:
                exp_nets[p.user_id] += (p.amount_paid - p.amount_owed)
                
            e_creditors = {u: amt for u, amt in exp_nets.items() if amt > 0.01}
            e_debtors = {u: -amt for u, amt in exp_nets.items() if amt < -0.01}
            
            for d_id, d_amt in e_debtors.items():
                for c_id, c_amt in list(e_creditors.items()):
                    if d_amt <= 0.01: break
                    if c_amt <= 0.01: continue
                    settle = min(d_amt, c_amt)
                    d_amt -= settle
                    e_creditors[c_id] -= settle
                    pairwise[d_id][c_id] += settle
                    
        for stl in settlements:
            pairwise[stl.payer_id][stl.payee_id] -= stl.amount
            
        resolved = set()
        for a in pairwise.keys():
            for b in pairwise[a].keys():
                if (a, b) in resolved or (b, a) in resolved: continue
                net_ab = pairwise[a][b] - pairwise[b][a]
                if net_ab > 0.01:
                    db.add(models.Balance(group_id=group_id, from_user_id=a, to_user_id=b, amount=net_ab))
                elif net_ab < -0.01:
                    db.add(models.Balance(group_id=group_id, from_user_id=b, to_user_id=a, amount=-net_ab))
                resolved.add((a, b))

    db.commit()

@app.post("/expenses/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Authorize
    if expense.group_id:
        group = db.query(models.Group).filter(models.Group.id == expense.group_id).first()
        if not group or current_user.id not in [m.user_id for m in group.members]:
            raise HTTPException(status_code=403, detail="Not authorized to create expenses in this group")
    else:
        # Individual expense: User must be a participant
        participant_ids = [p.user_id for p in expense.participants]
        if current_user.id not in participant_ids:
            raise HTTPException(status_code=403, detail="You must be a participant in an individual expense")

    # 2. Validate totals
    total_paid = sum(p.amount_paid for p in expense.participants)
    total_owed = sum(p.amount_owed for p in expense.participants)
    
    if abs(total_paid - expense.total_amount) > 0.01 or abs(total_owed - expense.total_amount) > 0.01:
        raise HTTPException(status_code=400, detail="Participants paid/owed sum must equal total amount.")

    # 3. Create the Expense
    db_expense = models.Expense(
        group_id=expense.group_id,
        created_by=current_user.id,
        description=expense.description,
        total_amount=expense.total_amount,
        currency=expense.currency,
        date=expense.date or datetime.datetime.utcnow(),
        category=expense.category or "Entertainment / Drinks",
        has_receipt=expense.has_receipt or False
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)

    # 4. Create Participants
    for p in expense.participants:
        db_participant = models.ExpenseParticipant(
            expense_id=db_expense.id,
            user_id=p.user_id,
            amount_paid=p.amount_paid,
            amount_owed=p.amount_owed
        )
        db.add(db_participant)
    db.commit()

    # 5. Rebuild balances dynamically
    rebuild_balances(expense.group_id, db)
    db.refresh(db_expense)
    return schemas.Expense.model_validate(db_expense)

@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(expense_id: int, expense_in: schemas.ExpenseCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # 1. Authorize
    if db_expense.group_id:
        group = db.query(models.Group).filter(models.Group.id == db_expense.group_id).first()
        if not group or current_user.id not in [m.user_id for m in group.members]:
            raise HTTPException(status_code=403, detail="Not authorized to edit expenses in this group")
    else:
        participant_ids = [p.user_id for p in db_expense.participants]
        if current_user.id != db_expense.created_by and current_user.id not in participant_ids:
            raise HTTPException(status_code=403, detail="Not authorized to edit this expense")

    # 2. Validate totals
    total_paid = sum(p.amount_paid for p in expense_in.participants)
    total_owed = sum(p.amount_owed for p in expense_in.participants)
    if abs(total_paid - expense_in.total_amount) > 0.01 or abs(total_owed - expense_in.total_amount) > 0.01:
        raise HTTPException(status_code=400, detail="Participants paid/owed sum must equal total amount.")

    # 3. Update expense fields
    db_expense.description = expense_in.description
    db_expense.total_amount = expense_in.total_amount
    db_expense.currency = expense_in.currency
    db_expense.category = expense_in.category
    db_expense.date = expense_in.date or db_expense.date
    
    # 4. Remove old participants
    db.query(models.ExpenseParticipant).filter(models.ExpenseParticipant.expense_id == db_expense.id).delete()
    db.flush()

    # 5. Add new participants
    for p in expense_in.participants:
        db_participant = models.ExpenseParticipant(
            expense_id=db_expense.id,
            user_id=p.user_id,
            amount_paid=p.amount_paid,
            amount_owed=p.amount_owed
        )
        db.add(db_participant)
    db.commit()

    # 6. Rebuild balances dynamically
    rebuild_balances(db_expense.group_id, db)

    db.commit()
    db.refresh(db_expense)
    return schemas.Expense.model_validate(db_expense)

@app.get("/balances/{user_id}", response_model=List[schemas.BalanceSummary])
def get_user_balances(user_id: int, group_id: int = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' balances")
        
    query = db.query(models.Balance).filter(
        or_(models.Balance.from_user_id == user_id, models.Balance.to_user_id == user_id)
    )
    if group_id:
        query = query.filter(models.Balance.group_id == group_id)
    
    balances = query.all()
    return balances

@app.get("/balances/summary/{user_id}")
def get_global_balance_summary(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' balances")
        
    owes = sum(b.amount for b in db.query(models.Balance).filter(models.Balance.from_user_id == user_id).all())
    owed = sum(b.amount for b in db.query(models.Balance).filter(models.Balance.to_user_id == user_id).all())
    return {"total_owes": owes, "total_owed": owed, "net_balance": owed - owes}

@app.post("/settlements/", response_model=schemas.Settlement)
def create_settlement(settlement: schemas.SettlementCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id not in [settlement.payer_id, settlement.payee_id]:
        raise HTTPException(status_code=403, detail="You can only settle your own debts.")
        
    if settlement.amount <= 0:
        raise HTTPException(status_code=400, detail="Settlement amount must be positive.")

    db_settlement = models.Settlement(
        group_id=settlement.group_id,
        payer_id=settlement.payer_id,
        payee_id=settlement.payee_id,
        amount=settlement.amount,
        currency=settlement.currency,
        date=datetime.datetime.utcnow(),
        status="COMPLETED"
    )
    db.add(db_settlement)
    db.commit()

    if settlement.group_id:
        rebuild_balances(settlement.group_id, db)
    else:
        query = db.query(models.Balance).filter(
            models.Balance.from_user_id == settlement.payer_id,
            models.Balance.to_user_id == settlement.payee_id
        ).order_by(models.Balance.amount.desc()).all()
        
        remaining = settlement.amount
        groups_to_rebuild = set()
        
        for b in query:
            if remaining <= 0: break
            settle_amt = min(b.amount, remaining)
            remaining -= settle_amt
            
            sub_settlement = models.Settlement(
                group_id=b.group_id,
                payer_id=settlement.payer_id,
                payee_id=settlement.payee_id,
                amount=settle_amt,
                currency=settlement.currency,
                date=datetime.datetime.utcnow(),
                status="COMPLETED"
            )
            db.add(sub_settlement)
            groups_to_rebuild.add(b.group_id)
            
        if remaining > 0.01:
            sub_settlement = models.Settlement(
                group_id=None,
                payer_id=settlement.payer_id,
                payee_id=settlement.payee_id,
                amount=remaining,
                currency=settlement.currency,
                date=datetime.datetime.utcnow(),
                status="COMPLETED"
            )
            db.add(sub_settlement)
            groups_to_rebuild.add(None)
            
        db.delete(db_settlement)
        db.commit()
        
        for g_id in groups_to_rebuild:
            rebuild_balances(g_id, db)
        
        db_settlement = db.query(models.Settlement).filter(models.Settlement.payer_id == settlement.payer_id).first()
    db.commit()
    db.refresh(db_settlement)
    
    return db_settlement

# --- Audit Logs & User Expenses ---

def log_change(mapper, connection, target, action):
    target_type = target.__class__.__name__
    if target_type not in ["Expense", "Group", "Settlement"]:
        return
    
    user_id = None
    if hasattr(target, 'created_by'):
        user_id = target.created_by
    elif hasattr(target, 'payer_id'):
        user_id = target.payer_id

    changes_dict = {c.name: getattr(target, c.name) for c in target.__table__.columns}
    changes = json.dumps(jsonable_encoder(changes_dict))
    
    connection.execute(
        models.AuditLog.__table__.insert().values(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target.id,
            changes=changes
        )
    )
    
    notify_clients()

@event.listens_for(models.Expense, 'after_insert')
def receive_after_insert(mapper, connection, target): log_change(mapper, connection, target, 'CREATE')

@event.listens_for(models.Expense, 'after_update')
def receive_after_update(mapper, connection, target): log_change(mapper, connection, target, 'UPDATE')

@event.listens_for(models.Group, 'after_insert')
def receive_after_insert_group(mapper, connection, target): log_change(mapper, connection, target, 'CREATE')

@event.listens_for(models.Settlement, 'after_insert')
def receive_after_insert_settlement(mapper, connection, target): log_change(mapper, connection, target, 'CREATE')

@app.get("/users/{user_id}/expenses", response_model=List[schemas.ExpenseWithCreator])
def get_all_user_expenses(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' expenses")
        
    expenses = db.query(models.Expense).outerjoin(models.ExpenseParticipant).filter(
        or_(
            models.Expense.created_by == user_id,
            models.ExpenseParticipant.user_id == user_id
        )
    ).order_by(models.Expense.date.desc()).all()
    
    unique_expenses = {e.id: e for e in expenses}.values()
    
    result = []
    for e in unique_expenses:
        item = schemas.ExpenseWithCreator.model_validate(e)
        item.creator_name = e.creator.name if e.creator else None
        item.group_name = e.group.name if e.group else None
        result.append(item)
    
    result.sort(key=lambda x: x.date, reverse=True)
    return result

@app.get("/expenses/{expense_id}/audit", response_model=List[schemas.AuditLog])
def get_expense_audit_logs(expense_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Auth logic: Ensure current_user is involved with expense or group
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    if expense.group_id:
        group = db.query(models.Group).filter(models.Group.id == expense.group_id).first()
        if not group or current_user.id not in [m.user_id for m in group.members]:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        part_ids = [p.user_id for p in expense.participants]
        if current_user.id != expense.created_by and current_user.id not in part_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
            
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.target_type == 'Expense',
        models.AuditLog.target_id == expense_id
    ).order_by(models.AuditLog.timestamp.asc()).all()
    return logs

# --- Frontend Serving (Must be at the very bottom) ---
from fastapi.responses import FileResponse
import os

os.makedirs("frontend/dist", exist_ok=True)

# Mount the static assets directory specifically so they don't hit the catch-all
os.makedirs("frontend/dist/assets", exist_ok=True)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    path = os.path.join("frontend/dist", full_path)
    if os.path.isfile(path):
        return FileResponse(path)
    return FileResponse("frontend/dist/index.html")
