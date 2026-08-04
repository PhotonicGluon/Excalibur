"""
Add `keygen_algorithm` field to 'User' table

Revision ID: f92a6f1b79d9
Revises: e7e550fa60ed
Create Date: 2026-06-24 21:36:44.020342
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "f92a6f1b79d9"
down_revision: str | Sequence[str] | None = "e7e550fa60ed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("user", sa.Column("keygen_algorithm", sqlmodel.sql.sqltypes.AutoString(), server_default="pbkdf2"))
    op.alter_column("user", "keygen_algorithm", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "keygen_algorithm")
