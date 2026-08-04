"""
Make SRP fields optional

Revision ID: 31b8326dd3f5
Revises: 24ec4622b630
Create Date: 2026-03-20 13:28:08.458421
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "31b8326dd3f5"
down_revision: str | Sequence[str] | None = "24ec4622b630"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.alter_column(
        "user",
        "srp_group",
        existing_type=sa.Enum("SMALL", "MEDIUM", "LARGE", name="srpgroup"),
        nullable=True,
    )
    op.alter_column("user", "srp_salt", existing_type=sa.LargeBinary(length=32), nullable=True)
    op.alter_column("user", "srp_verifier", existing_type=sa.LargeBinary(), nullable=True)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.alter_column("user", "srp_verifier", existing_type=sa.LargeBinary(), nullable=False)
    op.alter_column("user", "srp_salt", existing_type=sa.LargeBinary(length=32), nullable=False)
    op.alter_column(
        "user",
        "srp_group",
        existing_type=sa.Enum("SMALL", "MEDIUM", "LARGE", name="srpgroup"),
        nullable=False,
    )
