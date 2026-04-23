"""
Modify `last_modified` field in 'FSItem' table to be BigInteger

Revision ID: bec09f59643a
Revises: 9c620153fcd1
Create Date: 2026-04-23 22:39:51.816964
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "bec09f59643a"
down_revision: Union[str, Sequence[str], None] = "9c620153fcd1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.alter_column(
        "fsitem", "last_modified", existing_type=sa.Integer(), type_=sa.BigInteger(), existing_nullable=False
    )


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.alter_column(
        "fsitem", "last_modified", existing_type=sa.BigInteger(), type_=sa.Integer(), existing_nullable=False
    )
