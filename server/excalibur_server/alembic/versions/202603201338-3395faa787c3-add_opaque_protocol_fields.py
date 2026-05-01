"""
Add OPAQUE protocol fields

Revision ID: 3395faa787c3
Revises: 31b8326dd3f5
Create Date: 2026-03-20 13:38:50.404594
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "3395faa787c3"
down_revision: str | Sequence[str] | None = "31b8326dd3f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

authprotocol = sa.Enum("SRP", "OPAQUE_3DH", name="authprotocol")


def upgrade() -> None:
    """
    Upgrade schema.
    """

    authprotocol.create(op.get_bind())
    op.add_column("user", sa.Column("auth_protocol", authprotocol, server_default="SRP"))
    op.alter_column("user", "auth_protocol", existing_type=authprotocol, nullable=False)
    op.add_column("user", sa.Column("registration_record", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("user", "registration_record")
    op.drop_column("user", "auth_protocol")
    authprotocol.drop(op.get_bind())
