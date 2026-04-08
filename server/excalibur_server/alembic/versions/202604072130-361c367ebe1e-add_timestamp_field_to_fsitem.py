"""
Add 'timestamp' field to FSItem

Revision ID: 361c367ebe1e
Revises: b8f3c0bbad87
Create Date: 2026-04-07 21:30:57.460080
"""

import time
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "361c367ebe1e"
down_revision: Union[str, Sequence[str], None] = "b8f3c0bbad87"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("fsitem", sa.Column("timestamp", sa.Integer(), server_default=str(int(time.time()))))
    op.alter_column("fsitem", "timestamp", nullable=False)
    op.drop_column("fsitem", "mimetype")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.add_column("fsitem", sa.Column("mimetype", sa.String()))
    op.alter_column("fsitem", "mimetype", nullable=True)
    op.drop_column("fsitem", "timestamp")
