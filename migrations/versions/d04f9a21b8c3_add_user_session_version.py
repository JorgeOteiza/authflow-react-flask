"""Add user session version for global JWT invalidation.

Revision ID: d04f9a21b8c3
Revises: c12a7e4b91f0
"""
from alembic import op
import sqlalchemy as sa


revision = "d04f9a21b8c3"
down_revision = "c12a7e4b91f0"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.add_column(sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("session_version")
