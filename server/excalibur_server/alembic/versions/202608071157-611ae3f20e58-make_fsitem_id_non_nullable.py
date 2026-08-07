"""
Make `fsitem_id` non-nullable in 'User' table

Revision ID: 611ae3f20e58
Revises: f92a6f1b79d9
Create Date: 2026-08-07 11:57:17.312124
"""

from collections.abc import Sequence

from alembic import op

# Revision identifiers used by Alembic
revision: str = "611ae3f20e58"
down_revision: str | Sequence[str] | None = "f92a6f1b79d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.alter_column("user", "fsitem_id", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.alter_column("user", "fsitem_id", nullable=True)
