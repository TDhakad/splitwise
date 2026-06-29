from sqlalchemy import Boolean, CheckConstraint, Column, ForeignKey, Integer, String, Float, DateTime, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from sqlalchemy.types import TypeDecorator
from .database import Base

class Currency(TypeDecorator):
    """
    SQLAlchemy TypeDecorator to store currency as Integer cents in DB,
    but treat as Float dollars in Python.
    """
    impl = Integer
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return int(round(value * 100))
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return value / 100.0
        return None

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    auth_provider_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    groups = relationship("GroupMember", back_populates="user")
    expenses_created = relationship("Expense", foreign_keys="[Expense.created_by]", back_populates="creator")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    simplify_debts = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    members = relationship("GroupMember", back_populates="group")
    expenses = relationship("Expense", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    group_id = Column(Integer, ForeignKey("groups.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="groups")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    total_amount = Column(Currency)
    currency = Column(String, default="USD")
    date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    category = Column(String, nullable=True, default="Entertainment / Drinks")
    has_receipt = Column(Boolean, default=False)
    receipt_breakdown = Column(JSON, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="expenses")
    creator = relationship("User", foreign_keys=[created_by], back_populates="expenses_created")
    participants = relationship("ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan")
    plan = relationship("Plan", back_populates="expenses")

    __table_args__ = (
        CheckConstraint("total_amount > 0", name="ck_expenses_total_amount_positive"),
    )

class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    name = Column(String)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    total_budget = Column(Integer) # In cents
    status = Column(String, default="draft") # draft, active, completed
    type = Column(String, default="custom") # trip, monthly_budget, custom
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    group = relationship("Group")
    groups = relationship("PlanGroup", back_populates="plan", cascade="all, delete-orphan")
    allocations = relationship("PlanAllocation", back_populates="plan", cascade="all, delete-orphan")
    predecisions = relationship("PlanPredecision", back_populates="plan", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="plan")

    __table_args__ = (
        CheckConstraint("total_budget >= 0", name="ck_plans_total_budget_non_negative"),
        CheckConstraint("status IN ('draft', 'active', 'completed')", name="ck_plans_status"),
        CheckConstraint("type IN ('trip', 'monthly_budget', 'custom')", name="ck_plans_type"),
    )

class PlanAllocation(Base):
    __tablename__ = "plan_allocations"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    category = Column(String)
    allocated_amount = Column(Integer) # In cents

    plan = relationship("Plan", back_populates="allocations")

    __table_args__ = (
        UniqueConstraint("plan_id", "category", name="uq_plan_allocations_plan_category"),
        CheckConstraint("allocated_amount >= 0", name="ck_plan_allocations_amount_non_negative"),
    )

class PlanPredecision(Base):
    __tablename__ = "plan_predecisions"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    title = Column(String)
    category = Column(String)
    expected_amount = Column(Integer) # In cents
    status = Column(String, default="expected") # expected, realized

    plan = relationship("Plan", back_populates="predecisions")

    __table_args__ = (
        CheckConstraint("expected_amount >= 0", name="ck_plan_predecisions_amount_non_negative"),
        CheckConstraint("status IN ('expected', 'realized')", name="ck_plan_predecisions_status"),
    )

class PlanGroup(Base):
    __tablename__ = "plan_groups"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    group_id = Column(Integer, ForeignKey("groups.id"))

    plan = relationship("Plan", back_populates="groups")
    group = relationship("Group")

    __table_args__ = (
        UniqueConstraint("plan_id", "group_id", name="uq_plan_groups_plan_group"),
    )

class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"))
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount_paid = Column(Currency, default=0.0)
    amount_owed = Column(Currency, default=0.0)

    expense = relationship("Expense", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("expense_id", "user_id", name="uq_expense_participants_expense_user"),
        CheckConstraint("amount_paid >= 0", name="ck_expense_participants_amount_paid_non_negative"),
        CheckConstraint("amount_owed >= 0", name="ck_expense_participants_amount_owed_non_negative"),
    )

class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    payer_id = Column(Integer, ForeignKey("users.id"), index=True)
    payee_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount = Column(Currency)
    currency = Column(String, default="USD")
    date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_settlements_amount_positive"),
        CheckConstraint("payer_id != payee_id", name="ck_settlements_distinct_users"),
        CheckConstraint("status IN ('COMPLETED')", name="ck_settlements_status"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who made the change (if available)
    action = Column(String) # e.g., "CREATE", "UPDATE", "DELETE"
    target_type = Column(String) # e.g., "Expense", "Group", "Settlement"
    target_id = Column(Integer)
    changes = Column(String, nullable=True) # JSON representation of changes or state
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"))
    addressee_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, REJECTED, REMOVED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    requester = relationship("User", foreign_keys=[requester_id])
    addressee = relationship("User", foreign_keys=[addressee_id])

    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendships_requester_addressee"),
        CheckConstraint("requester_id != addressee_id", name="ck_friendships_distinct_users"),
        CheckConstraint("status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REMOVED')", name="ck_friendships_status"),
    )


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    type = Column(String, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_type = Column(String)
    target_id = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])
