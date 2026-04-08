"""
Add `obfuscated_names` field to 'User' table

Revision ID: 4953e3e54a0f
Revises: 361c367ebe1e
Create Date: 2026-04-08 19:10:37.630682
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "4953e3e54a0f"
down_revision: Union[str, Sequence[str], None] = "361c367ebe1e"
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
