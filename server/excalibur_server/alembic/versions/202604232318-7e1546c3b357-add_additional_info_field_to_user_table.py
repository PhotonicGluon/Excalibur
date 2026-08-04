"""
Add `additional_info` field to 'User' table

Revision ID: 7e1546c3b357
Revises: 3395faa787c3
Create Date: 2026-04-18 13:35:14.672531
Update Date: 2026-05-01 20:11:27.123456
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "7e1546c3b357"
down_revision: str | Sequence[str] | None = "3395faa787c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
