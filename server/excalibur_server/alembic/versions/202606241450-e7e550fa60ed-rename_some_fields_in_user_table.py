"""
Rename some fields in 'User' table

Revision ID: e7e550fa60ed
Revises: 4d8b5384df3c
Create Date: 2026-06-24 14:50:28.355214
"""

from collections.abc import Sequence

from alembic import op

# Revision identifiers used by Alembic
revision: str = "e7e550fa60ed"
down_revision: str | Sequence[str] | None = "4d8b5384df3c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.alter_column("user", "additional_info", new_column_name="vault_info")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.alter_column("user", "vault_info", new_column_name="additional_info")
