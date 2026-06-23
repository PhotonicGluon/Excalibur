"""
Add `keygen_function` field to 'User' table

Revision ID: f92a6f1b79d9
Revises: 4d8b5384df3c
Create Date: 2026-06-23 22:16:11.020342
"""

from typing import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "f92a6f1b79d9"
down_revision: str | Sequence[str] | None = "4d8b5384df3c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("user", sa.Column("keygen_function", sqlmodel.sql.sqltypes.AutoString(), server_default="pbkdf2"))
    op.alter_column("user", "keygen_function", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "keygen_function")
