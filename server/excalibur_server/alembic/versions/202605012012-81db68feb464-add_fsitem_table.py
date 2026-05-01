"""
Add 'FSItem' table

Revision ID: b694df3c8a7b
Revises: 7e1546c3b357
Create Date: 2026-03-31 19:27:28.343528
Update Date: 2026-05-01 20:15:19.123456
"""

from typing import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "b694df3c8a7b"
down_revision: str | Sequence[str] | None = "7e1546c3b357"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.create_table(
        "fsitem",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("root_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_folder", sa.Boolean(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=True),
        sa.Column("timestamp", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_id", "name", name="unique_parent_name"),
    )
    op.add_column("user", sa.Column("fsitem_id", sa.Uuid()))
    op.alter_column("user", "fsitem_id", existing_type=sa.Uuid(), nullable=True)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "fsitem_id")
    op.drop_table("fsitem")
