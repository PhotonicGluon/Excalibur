"""
Update fields in 'FSItem' table

Revision ID: b8f3c0bbad87
Revises: 159326cc191a
Create Date: 2026-04-03 20:42:39.629947
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# Revision identifiers used by Alembic
revision: str = "b8f3c0bbad87"
down_revision: Union[str, Sequence[str], None] = "159326cc191a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("fsitem", sa.Column("root_id", sa.Uuid()))
    op.alter_column("fsitem", "root_id", nullable=False)
    op.alter_column("fsitem", "mime_type", existing_type=sqlmodel.sql.sqltypes.AutoString(), new_column_name="mimetype")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.alter_column("fsitem", "mimetype", existing_type=sqlmodel.sql.sqltypes.AutoString(), new_column_name="mime_type")
    op.drop_column("fsitem", "root_id")
