"""
Version 0.2.0

Revision ID: 24ec4622b630
Revises:
Create Date: 2025-09-05 14:24:15.613667
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "24ec4622b630"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.create_table(
        "user",
        sa.Column("username", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("auk_salt", sa.LargeBinary(length=32), nullable=False),
        sa.Column("srp_group", sa.Enum("SMALL", "MEDIUM", "LARGE", name="srpgroup"), nullable=False),
        sa.Column("srp_salt", sa.LargeBinary(length=32), nullable=False),
        sa.Column("srp_verifier", sa.LargeBinary(), nullable=False),
        sa.Column("key_enc", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("username"),
    )


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_table("user")
