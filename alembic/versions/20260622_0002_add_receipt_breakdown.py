"""add receipt breakdown to expenses

Revision ID: 20260622_0002
Revises: 20260618_0001
Create Date: 2026-06-22
"""

from alembic import op
import sqlalchemy as sa

revision = "20260622_0002"
down_revision = "20260618_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("receipt_breakdown", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "receipt_breakdown")
