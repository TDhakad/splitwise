from pydantic import BaseModel, EmailStr, Field
from typing import List, Literal, Optional
from datetime import datetime, timezone
from enum import Enum

class ExpenseCategory(str, Enum):
    DINING = "Dining"
    ACCOMMODATION = "Accommodation"
    TRANSPORT = "Transport"
    GROCERIES = "Groceries"
    ENTERTAINMENT = "Entertainment"
    GENERAL = "General"

# Users
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = Field(default=None, min_length=8)
    auth_provider: Optional[Literal["local", "google"]] = "local"
    auth_provider_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    token: str

class User(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Groups
class GroupBase(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    simplify_debts: Optional[bool] = False

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: int
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True

class GroupDetail(Group):
    members: List["User"] = []
    class Config:
        from_attributes = True

# Balances
class BalanceSummary(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float = Field(ge=0)
    group_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Expenses
class ExpenseParticipantBase(BaseModel):
    user_id: int
    amount_paid: float = Field(default=0.0, ge=0)
    amount_owed: float = Field(default=0.0, ge=0)

class ReceiptBreakdownTotals(BaseModel):
    subtotal: float = 0
    discount: float = 0
    tax: float = 0
    tip: float = 0
    total: float

class ReceiptBreakdownShare(BaseModel):
    user_id: int
    amount: float = Field(ge=0)

class ReceiptBreakdownItem(BaseModel):
    name: str
    quantity: float | int | str | None = None
    price: float = Field(ge=0)
    split_type: Literal["individual", "shared", "custom"]
    shares: List[ReceiptBreakdownShare] = Field(min_length=1)

class ReceiptBreakdownMemberTotal(BaseModel):
    user_id: int
    subtotal: float = 0
    discount: float = 0
    tax: float = 0
    tip: float = 0
    total: float

class ReceiptBreakdown(BaseModel):
    distribution_method: Literal["proportional_by_item_subtotal"] = "proportional_by_item_subtotal"
    totals: ReceiptBreakdownTotals
    items: List[ReceiptBreakdownItem]
    member_totals: List[ReceiptBreakdownMemberTotal]

class ExpenseCreate(BaseModel):
    group_id: Optional[int] = None
    plan_id: Optional[int] = None
    description: str = Field(min_length=1)
    total_amount: float = Field(gt=0)
    currency: Literal["USD"] = "USD"
    date: Optional[datetime] = None
    category: Optional[ExpenseCategory] = ExpenseCategory.GENERAL
    has_receipt: Optional[bool] = False
    receipt_breakdown: Optional[ReceiptBreakdown] = None
    participants: List[ExpenseParticipantBase] = Field(min_length=1)

class ExpenseParticipant(ExpenseParticipantBase):
    id: int
    class Config:
        from_attributes = True

class Expense(BaseModel):
    id: int
    group_id: Optional[int]
    plan_id: Optional[int] = None
    created_by: int
    description: str
    total_amount: float
    currency: str
    date: datetime
    category: Optional[str] = None
    has_receipt: Optional[bool] = False
    receipt_breakdown: Optional[ReceiptBreakdown] = None
    is_deleted: Optional[bool] = False
    deleted_by: Optional[int] = None
    deleted_at: Optional[datetime] = None
    participants: List[ExpenseParticipant]
    
    class Config:
        from_attributes = True

class ExpenseWithCreator(Expense):
    creator_name: Optional[str] = None
    group_name: Optional[str] = None
    class Config:
        from_attributes = True

# Settlement
class SettlementCreate(BaseModel):
    group_id: Optional[int] = None
    payer_id: int
    payee_id: int
    amount: float = Field(gt=0)
    currency: Literal["USD"] = "USD"
    
class SettlementUpdate(BaseModel):
    amount: float = Field(gt=0)
    
class Settlement(SettlementCreate):
    id: int
    date: datetime
    status: str
    class Config:
        from_attributes = True

# Audit Logs
class AuditLog(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    target_type: str
    target_id: int
    changes: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Friendships
class FriendshipCreate(BaseModel):
    email: EmailStr

class Friendship(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FriendshipWithUsers(Friendship):
    requester: User
    addressee: User
    class Config:
        from_attributes = True

# Preplanning
class PlanAllocationBase(BaseModel):
    category: ExpenseCategory
    allocated_amount: int # In cents

class PlanAllocationCreate(PlanAllocationBase):
    pass

class PlanAllocation(PlanAllocationBase):
    id: int
    plan_id: int
    class Config:
        from_attributes = True

class PlanPredecisionBase(BaseModel):
    title: str
    category: ExpenseCategory
    expected_amount: int # In cents
    status: Literal["expected", "realized"] = "expected"

class PlanPredecisionCreate(PlanPredecisionBase):
    pass

class PlanPredecision(PlanPredecisionBase):
    id: int
    plan_id: int
    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    name: str = Field(min_length=1)
    start_date: datetime
    end_date: datetime
    total_budget: int # In cents
    status: Literal["draft", "active", "completed"] = "draft"
    type: Literal["trip", "monthly_budget", "custom"] = "custom"
    group_id: Optional[int] = None

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_budget: Optional[int] = None
    status: Optional[Literal["draft", "active", "completed"]] = None
    type: Optional[Literal["trip", "monthly_budget", "custom"]] = None
    group_id: Optional[int] = None

class Plan(PlanBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_spent: int = 0

    class Config:
        from_attributes = True

class PlanDetail(Plan):
    allocations: List[PlanAllocation] = []
    predecisions: List[PlanPredecision] = []
    tracked_groups: List[Group] = []
    expenses: List[ExpenseWithCreator] = []
    total_allocated: int = 0
    allocations_spent: dict[str, int] = {} # Map category name to spent amount in cents
