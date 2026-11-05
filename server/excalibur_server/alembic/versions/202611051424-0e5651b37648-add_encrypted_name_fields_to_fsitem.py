"""
Add encrypted name fields to 'FSItem' table

Revision ID: 0e5651b37648
Revises: 88447396b13b
Create Date: 2026-11-05 14:24:20.420666
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "0e5651b37648"
down_revision: str | Sequence[str] | None = "88447396b13b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FSITEM_COLUMNS = (
    "id, parent_id, root_id, name, is_folder, size, timestamp, ciphertext_hash, content_mac, node_hash, version"
)


def upgrade() -> None:
    """
    Upgrade schema.
    """

    # Since DuckDB doesn't support `ALTER TABLE ... ADD/DROP CONSTRAINT`, we need to create a new
    # temporary table and copy the data over
    op.execute("""
        CREATE TABLE "fsitem_temp"(
            id UUID NOT NULL,
            parent_id UUID,
            root_id UUID NOT NULL,
            name VARCHAR,
            name_enc BLOB,
            name_tag BLOB,
            is_folder BOOLEAN NOT NULL,
            size INTEGER,
            timestamp INTEGER NOT NULL,
            ciphertext_hash BLOB,
            content_mac BLOB,
            node_hash BLOB,
            version INTEGER DEFAULT(0) NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT unique_parent_name UNIQUE (parent_id, name),
            CONSTRAINT unique_parent_name_tag UNIQUE (parent_id, name_tag)
        );
    """)

    # Copy everything over; the encrypted fields start empty and are filled in by the client
    op.execute(f"INSERT INTO fsitem_temp ({FSITEM_COLUMNS}) SELECT {FSITEM_COLUMNS} FROM fsitem")

    op.drop_table("fsitem")
    op.rename_table("fsitem_temp", "fsitem")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    conn = op.get_bind()

    # Check if there are any items with only an encrypted name
    num_erased = conn.execute(
        sa.text("SELECT count(*) FROM fsitem WHERE name IS NULL AND parent_id IS NOT NULL")
    ).scalar_one()
    if num_erased > 0:
        from rich.console import Console
        from rich.prompt import Confirm

        console = Console()
        console.print(
            f"[yellow][bold]Warning:[/bold] {num_erased} items only have encrypted names, which the server cannot "
            "decrypt.[/yellow]"
        )
        console.print(
            "[yellow]Continuing with the downgrade will mean that the items' names [bold]will be lost forever[/bold]."
            "[/yellow]"
        )
        if not Confirm.ask("Do you want to continue?", default=False):
            console.print("[yellow]Downgrade cancelled.[/yellow]")
            return

    # Root items get their legacy name back (the owning user's ID)
    op.execute("""
        UPDATE fsitem SET name = CAST(u.id AS VARCHAR)
        FROM "user" u
        WHERE u.fsitem_id = fsitem.id AND fsitem.name IS NULL
    """)

    op.execute("""
        CREATE TABLE "fsitem_temp"(
            id UUID NOT NULL,
            parent_id UUID,
            root_id UUID NOT NULL,
            name VARCHAR NOT NULL,
            is_folder BOOLEAN NOT NULL,
            size INTEGER,
            timestamp INTEGER NOT NULL,
            ciphertext_hash BLOB,
            content_mac BLOB,
            node_hash BLOB,
            version INTEGER DEFAULT(0) NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT unique_parent_name UNIQUE (parent_id, name)
        );
    """)
    op.execute(f"INSERT INTO fsitem_temp ({FSITEM_COLUMNS}) SELECT {FSITEM_COLUMNS} FROM fsitem")

    op.drop_table("fsitem")
    op.rename_table("fsitem_temp", "fsitem")
