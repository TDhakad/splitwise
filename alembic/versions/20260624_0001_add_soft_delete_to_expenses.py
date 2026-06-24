"""Add soft delete to expenses

Revision ID: 20260624_0001
Revises: 931d1952f3e7
Create Date: 2026-06-24

"""

from alembic import op
import sqlalchemy as sa

revision = "20260624_0001"
down_revision = "a8ec4f3aca3c"
branch_labels = None
depends_on = None

def upgrade() -> None:
    with op.batch_alter_table('expenses') as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('deleted_by', sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('expenses') as batch_op:
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('deleted_by')
        batch_op.drop_column('is_deleted')
