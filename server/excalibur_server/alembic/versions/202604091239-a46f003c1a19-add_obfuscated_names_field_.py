"""
Add `obfuscated_names` field to 'User' table

Revision ID: a46f003c1a19
Revises: 9c620153fcd1
Create Date: 2026-04-08 19:10:37.630682
Update Date: 2026-04-09 12:39:15.250715
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "a46f003c1a19"
down_revision: Union[str, Sequence[str], None] = "9c620153fcd1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.add_column("user", sa.Column("obfuscated_names", sa.Boolean(), server_default="false"))
    op.alter_column("user", "obfuscated_names", existing_type=sa.Boolean(), nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "obfuscated_names")
