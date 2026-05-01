"""
Add `fullpath` and `last_modified` fields to 'FSItem' table

Revision ID: 9c620153fcd1
Revises: 361c367ebe1e
Create Date: 2026-04-09 11:46:22.060904
"""

import time
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "9c620153fcd1"
down_revision: Union[str, Sequence[str], None] = "361c367ebe1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("fsitem", sa.Column("fullpath", sqlmodel.sql.sqltypes.AutoString(), server_default=""))
    op.alter_column("fsitem", "fullpath", nullable=False)
    op.add_column("fsitem", sa.Column("last_modified", sa.Integer(), server_default=str(int(time.time()))))
    op.alter_column("fsitem", "last_modified", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("fsitem", "last_modified")
    op.drop_column("fsitem", "fullpath")
