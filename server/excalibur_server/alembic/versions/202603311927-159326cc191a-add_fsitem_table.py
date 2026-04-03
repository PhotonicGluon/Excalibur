"""
Add 'FSItem' table

Revision ID: 159326cc191a
Revises: 3395faa787c3
Create Date: 2026-03-31 19:27:28.343528
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "159326cc191a"
down_revision: Union[str, Sequence[str], None] = "3395faa787c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.create_table(
        "fsitem",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_folder", sa.Boolean(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
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
