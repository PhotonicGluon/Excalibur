"""
Add `additional_info` field to 'User' table

Revision ID: 7e1546c3b357
Revises: bec09f59643a
Create Date: 2026-04-18 13:35:14.672531
Update Date: 2026-04-24 23:18:45.123456
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "7e1546c3b357"
down_revision: Union[str, Sequence[str], None] = "bec09f59643a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("user", sa.Column("additional_info", sqlmodel.sql.sqltypes.AutoString(), server_default=""))
    op.alter_column("user", "additional_info", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "additional_info")
