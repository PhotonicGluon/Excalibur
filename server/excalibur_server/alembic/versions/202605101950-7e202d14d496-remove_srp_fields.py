"""
Remove SRP fields

Revision ID: 7e202d14d496
Revises: b694df3c8a7b
Create Date: 2026-05-10 19:50:54.459239
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "7e202d14d496"
down_revision: str | Sequence[str] | None = "b694df3c8a7b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.drop_column("user", "srp_salt")
    op.drop_column("user", "srp_verifier")
    op.drop_column("user", "srp_group")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.add_column(
        "user",
        sa.Column(
            "srp_group", sa.Enum("SMALL", "MEDIUM", "LARGE", name="srpgroup"), autoincrement=False, nullable=True
        ),
    )
    op.add_column("user", sa.Column("srp_verifier", sa.LargeBinary(), nullable=True))
    op.add_column("user", sa.Column("srp_salt", sa.LargeBinary(length=32), nullable=True))
