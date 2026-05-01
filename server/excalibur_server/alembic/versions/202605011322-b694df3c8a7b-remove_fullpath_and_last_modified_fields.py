"""
Remove `fullpath` and `last_modified` fields from 'FSItem' table

Revision ID: b694df3c8a7b
Revises: 7e1546c3b357
Create Date: 2026-05-01 13:22:26.254272
"""

from time import time_ns
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "b694df3c8a7b"
down_revision: Union[str, Sequence[str], None] = "7e1546c3b357"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.drop_column("fsitem", "fullpath")
    op.drop_column("fsitem", "last_modified")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.add_column("fsitem", sa.Column("fullpath", sqlmodel.sql.sqltypes.AutoString(), server_default=""))
    op.alter_column("fsitem", "fullpath", nullable=False)
    op.add_column("fsitem", sa.Column("last_modified", sa.Integer(), server_default=str(time_ns())))
    op.alter_column("fsitem", "last_modified", nullable=False)
