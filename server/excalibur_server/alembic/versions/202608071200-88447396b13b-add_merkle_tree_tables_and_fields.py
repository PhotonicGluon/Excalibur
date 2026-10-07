"""
Add Merkle tree tables and fields

Revision ID: 88447396b13b
Revises: 611ae3f20e58
Create Date: 2026-08-07 12:00:51.826374
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "88447396b13b"
down_revision: str | Sequence[str] | None = "611ae3f20e58"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

merkle_status = sa.Enum("NONE", "MIGRATING", "ACTIVE", name="merklestatus")


def upgrade() -> None:
    """
    Upgrade schema.
    """

    op.create_table(
        "attestation",
        sa.Column("root_id", sa.Uuid(), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("root_hash", sa.LargeBinary(), nullable=False),
        sa.Column("prev_root_hash", sa.LargeBinary(), nullable=True),
        sa.Column("timestamp", sa.Integer(), nullable=False),
        sa.Column("tag", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("root_id", "generation"),
    )
    op.create_table(
        "vaultstate",
        sa.Column("root_id", sa.Uuid(), nullable=False),
        sa.Column("merkle_status", merkle_status, nullable=False),
        sa.Column("current_generation", sa.Integer(), nullable=False),
        sa.Column("migrated_count", sa.Integer(), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("root_id"),
    )
    op.add_column("fsitem", sa.Column("ciphertext_hash", sa.LargeBinary(), nullable=True))
    op.add_column("fsitem", sa.Column("content_mac", sa.LargeBinary(), nullable=True))
    op.add_column("fsitem", sa.Column("node_hash", sa.LargeBinary(), nullable=True))
    op.add_column("fsitem", sa.Column("version", sa.Integer(), server_default="0"))
    op.alter_column("fsitem", "version", nullable=False)


def downgrade() -> None:
    """
    Downgrade schema.
    """

    op.drop_column("fsitem", "version")
    op.drop_column("fsitem", "node_hash")
    op.drop_column("fsitem", "content_mac")
    op.drop_column("fsitem", "ciphertext_hash")
    op.drop_table("vaultstate")
    op.drop_table("attestation")
    merkle_status.drop(op.get_bind())
