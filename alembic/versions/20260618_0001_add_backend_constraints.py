"""add backend constraints

Revision ID: 20260618_0001
Revises:
Create Date: 2026-06-18
"""

from alembic import op

revision = "20260618_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_expenses_total_amount_positive", "expenses", "total_amount > 0")

    op.create_check_constraint("ck_plans_total_budget_non_negative", "plans", "total_budget >= 0")
    op.create_check_constraint("ck_plans_status", "plans", "status IN ('draft', 'active', 'completed')")
    op.create_check_constraint("ck_plans_type", "plans", "type IN ('trip', 'monthly_budget', 'custom')")

    op.create_unique_constraint("uq_plan_allocations_plan_category", "plan_allocations", ["plan_id", "category"])
    op.create_check_constraint("ck_plan_allocations_amount_non_negative", "plan_allocations", "allocated_amount >= 0")

    op.create_check_constraint("ck_plan_predecisions_amount_non_negative", "plan_predecisions", "expected_amount >= 0")
    op.create_check_constraint("ck_plan_predecisions_status", "plan_predecisions", "status IN ('expected', 'realized')")

    op.create_unique_constraint("uq_plan_groups_plan_group", "plan_groups", ["plan_id", "group_id"])

    op.create_unique_constraint("uq_expense_participants_expense_user", "expense_participants", ["expense_id", "user_id"])
    op.create_check_constraint(
        "ck_expense_participants_amount_paid_non_negative",
        "expense_participants",
        "amount_paid >= 0",
    )
    op.create_check_constraint(
        "ck_expense_participants_amount_owed_non_negative",
        "expense_participants",
        "amount_owed >= 0",
    )

    op.create_check_constraint("ck_settlements_amount_positive", "settlements", "amount > 0")
    op.create_check_constraint("ck_settlements_distinct_users", "settlements", "payer_id != payee_id")
    op.create_check_constraint("ck_settlements_status", "settlements", "status IN ('COMPLETED')")

    op.create_unique_constraint("uq_balances_group_from_to", "balances", ["group_id", "from_user_id", "to_user_id"])
    op.create_check_constraint("ck_balances_amount_non_negative", "balances", "amount >= 0")
    op.create_check_constraint("ck_balances_distinct_users", "balances", "from_user_id != to_user_id")

    op.create_unique_constraint("uq_friendships_requester_addressee", "friendships", ["requester_id", "addressee_id"])
    op.create_check_constraint("ck_friendships_distinct_users", "friendships", "requester_id != addressee_id")
    op.create_check_constraint(
        "ck_friendships_status",
        "friendships",
        "status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REMOVED')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_friendships_status", "friendships", type_="check")
    op.drop_constraint("ck_friendships_distinct_users", "friendships", type_="check")
    op.drop_constraint("uq_friendships_requester_addressee", "friendships", type_="unique")

    op.drop_constraint("ck_balances_distinct_users", "balances", type_="check")
    op.drop_constraint("ck_balances_amount_non_negative", "balances", type_="check")
    op.drop_constraint("uq_balances_group_from_to", "balances", type_="unique")

    op.drop_constraint("ck_settlements_status", "settlements", type_="check")
    op.drop_constraint("ck_settlements_distinct_users", "settlements", type_="check")
    op.drop_constraint("ck_settlements_amount_positive", "settlements", type_="check")

    op.drop_constraint("ck_expense_participants_amount_owed_non_negative", "expense_participants", type_="check")
    op.drop_constraint("ck_expense_participants_amount_paid_non_negative", "expense_participants", type_="check")
    op.drop_constraint("uq_expense_participants_expense_user", "expense_participants", type_="unique")

    op.drop_constraint("uq_plan_groups_plan_group", "plan_groups", type_="unique")

    op.drop_constraint("ck_plan_predecisions_status", "plan_predecisions", type_="check")
    op.drop_constraint("ck_plan_predecisions_amount_non_negative", "plan_predecisions", type_="check")

    op.drop_constraint("ck_plan_allocations_amount_non_negative", "plan_allocations", type_="check")
    op.drop_constraint("uq_plan_allocations_plan_category", "plan_allocations", type_="unique")

    op.drop_constraint("ck_plans_type", "plans", type_="check")
    op.drop_constraint("ck_plans_status", "plans", type_="check")
    op.drop_constraint("ck_plans_total_budget_non_negative", "plans", type_="check")

    op.drop_constraint("ck_expenses_total_amount_positive", "expenses", type_="check")
