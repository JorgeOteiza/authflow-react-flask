"""Add email verification, one-time tokens, revocation and security events.

Revision ID: c12a7e4b91f0
Revises: bf4f30c8c35a
"""
from alembic import op
import sqlalchemy as sa


revision = "c12a7e4b91f0"
down_revision = "bf4f30c8c35a"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.add_column(sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text('UPDATE "user" SET email_verified_at = created_at WHERE email_verified_at IS NULL'))

    op.create_table(
        "one_time_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("purpose", sa.String(24), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_one_time_token_token_hash", "one_time_token", ["token_hash"])
    op.create_index("ix_one_time_token_purpose", "one_time_token", ["purpose"])
    op.create_index("ix_one_time_token_user_id", "one_time_token", ["user_id"])

    op.create_table(
        "revoked_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(36), nullable=False),
        sa.Column("token_type", sa.String(16), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("jti"),
    )
    op.create_index("ix_revoked_token_jti", "revoked_token", ["jti"])
    op.create_index("ix_revoked_token_user_id", "revoked_token", ["user_id"])

    op.create_table(
        "security_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(48), nullable=False),
        sa.Column("user_id", sa.Integer()),
        sa.Column("email", sa.String(120)),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("details", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_security_event_event_type", "security_event", ["event_type"])
    op.create_index("ix_security_event_user_id", "security_event", ["user_id"])
    op.create_index("ix_security_event_created_at", "security_event", ["created_at"])


def downgrade():
    op.drop_table("security_event")
    op.drop_table("revoked_token")
    op.drop_table("one_time_token")
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("email_verified_at")
