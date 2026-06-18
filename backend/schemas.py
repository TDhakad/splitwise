from pydantic import BaseModel, EmailStr, Field
from typing import List, Literal, Optional
from datetime import datetime

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

class ExpenseCreate(BaseModel):
    group_id: Optional[int] = None
    description: str = Field(min_length=1)
    total_amount: float = Field(gt=0)
    currency: Literal["USD"] = "USD"
    date: Optional[datetime] = None
    category: Optional[str] = None
    has_receipt: Optional[bool] = False
    participants: List[ExpenseParticipantBase] = Field(min_length=1)

class ExpenseParticipant(ExpenseParticipantBase):
    id: int
    class Config:
        from_attributes = True

class Expense(BaseModel):
    id: int
    group_id: Optional[int]
    created_by: int
    description: str
    total_amount: float
    currency: str
    date: datetime
    category: Optional[str] = None
    has_receipt: Optional[bool] = False
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
