from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    auth_provider_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    groups = relationship("GroupMember", back_populates="user")
    expenses_created = relationship("Expense", back_populates="creator")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    simplify_debts = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("GroupMember", back_populates="group")
    expenses = relationship("Expense", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    group_id = Column(Integer, ForeignKey("groups.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="groups")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    total_amount = Column(Float)
    currency = Column(String, default="USD")
    date = Column(DateTime, default=datetime.datetime.utcnow)
    category = Column(String, nullable=True, default="Entertainment / Drinks")
    has_receipt = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    group = relationship("Group", back_populates="expenses")
    creator = relationship("User", back_populates="expenses_created")
    participants = relationship("ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan")
    plan = relationship("Plan", back_populates="expenses")

class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    name = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    total_budget = Column(Integer) # In cents
    status = Column(String, default="draft") # draft, active, completed
    type = Column(String, default="custom") # trip, monthly_budget, custom
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    group = relationship("Group")
    groups = relationship("PlanGroup", back_populates="plan", cascade="all, delete-orphan")
    allocations = relationship("PlanAllocation", back_populates="plan", cascade="all, delete-orphan")
    predecisions = relationship("PlanPredecision", back_populates="plan", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="plan")

class PlanAllocation(Base):
    __tablename__ = "plan_allocations"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    category = Column(String)
    allocated_amount = Column(Integer) # In cents

    plan = relationship("Plan", back_populates="allocations")

class PlanPredecision(Base):
    __tablename__ = "plan_predecisions"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    title = Column(String)
    category = Column(String)
    expected_amount = Column(Integer) # In cents
    status = Column(String, default="expected") # expected, realized

    plan = relationship("Plan", back_populates="predecisions")

class PlanGroup(Base):
    __tablename__ = "plan_groups"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    group_id = Column(Integer, ForeignKey("groups.id"))

    plan = relationship("Plan", back_populates="groups")
    group = relationship("Group")

class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount_paid = Column(Float, default=0.0)
    amount_owed = Column(Float, default=0.0)

    expense = relationship("Expense", back_populates="participants")
    user = relationship("User")

class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    payer_id = Column(Integer, ForeignKey("users.id"))
    payee_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    currency = Column(String, default="USD")
    date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    group = relationship("Group")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])

class Balance(Base):
    """
    A materialized view or computed table of current debt edges.
    Simplifies querying 'Who owes who'.
    """
    __tablename__ = "balances"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    from_user_id = Column(Integer, ForeignKey("users.id")) # Ower
    to_user_id = Column(Integer, ForeignKey("users.id"))   # Payee
    amount = Column(Float)
    
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    group = relationship("Group", foreign_keys=[group_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who made the change (if available)
    action = Column(String) # e.g., "CREATE", "UPDATE", "DELETE"
    target_type = Column(String) # e.g., "Expense", "Group", "Settlement"
    target_id = Column(Integer)
    changes = Column(String, nullable=True) # JSON representation of changes or state
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"))
    addressee_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, REJECTED, REMOVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    requester = relationship("User", foreign_keys=[requester_id])
    addressee = relationship("User", foreign_keys=[addressee_id])
