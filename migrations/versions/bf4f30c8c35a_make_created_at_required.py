"""Make user creation timestamp required.

Revision ID: bf4f30c8c35a
Revises: 82172db423b8
"""
from alembic import op
import sqlalchemy as sa


revision = "bf4f30c8c35a"
down_revision = "82172db423b8"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("UPDATE \"user\" SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column("created_at", existing_type=sa.DateTime(), nullable=False)


def downgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column("created_at", existing_type=sa.DateTime(), nullable=True)
