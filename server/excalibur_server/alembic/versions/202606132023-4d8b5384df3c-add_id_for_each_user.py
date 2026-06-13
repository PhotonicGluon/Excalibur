"""
Add ID for each `User`

Revision ID: 4d8b5384df3c
Revises: 7e202d14d496
Create Date: 2026-06-13 20:23:12.298771
"""

from typing import Sequence
from uuid import UUID, uuid4

import sqlalchemy as sa
from alembic import op

# Revision identifiers used by Alembic
revision: str = "4d8b5384df3c"
down_revision: str | Sequence[str] | None = "7e202d14d496"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Upgrade schema.
    """

    conn = op.get_bind()

    # Since DuckDB doesn't support `ALTER TABLE ... ADD/DROP CONSTRAINT`, we need to create a new
    # temporary table and copy the data over
    op.execute("""
        CREATE TABLE "user_temp"(
            id UUID NOT NULL,
            username VARCHAR NOT NULL,
            auth_protocol ENUM('SRP', 'OPAQUE_3DH') DEFAULT('OPAQUE_3DH') NOT NULL,
            fsitem_id UUID,
            additional_info VARCHAR DEFAULT('') NOT NULL,
            registration_record BLOB,
            auk_salt BLOB NOT NULL,
            key_enc BLOB NOT NULL,
            PRIMARY KEY (id)
        );
    """)

    # Populate the new table
    for row in conn.execute(sa.text("SELECT * FROM user")):
        if not isinstance(row.username, str):
            break

        conn.execute(
            sa.text(
                """
                INSERT INTO user_temp
                    (
                        id,
                        username,
                        auth_protocol,
                        fsitem_id,
                        additional_info,
                        registration_record,
                        auk_salt,
                        key_enc
                    )
                VALUES
                    (
                        :id,
                        :username,
                        :auth_protocol,
                        :fsitem_id,
                        :additional_info,
                        :registration_record,
                        :auk_salt,
                        :key_enc
                    )
            """.replace("\n", " ")
            ).bindparams(
                id=str(uuid4()),
                username=row.username,
                auth_protocol=row.auth_protocol,
                fsitem_id=row.fsitem_id,
                additional_info=row.additional_info,
                registration_record=row.registration_record,
                auk_salt=row.auk_salt,
                key_enc=row.key_enc,
            )
        )

    # Drop the old table
    op.drop_table("user")

    # Rename the new table
    op.rename_table("user_temp", "user")


def downgrade() -> None:
    """
    Downgrade schema.
    """

    conn = op.get_bind()

    # Since DuckDB doesn't support `ALTER TABLE ... ADD/DROP CONSTRAINT`, we need to create a new
    # temporary table and copy the data over
    op.execute("""
        CREATE TABLE "user_temp"(
            username VARCHAR NOT NULL,
            auth_protocol ENUM('SRP', 'OPAQUE_3DH') DEFAULT('OPAQUE_3DH') NOT NULL,
            fsitem_id UUID,
            additional_info VARCHAR DEFAULT('') NOT NULL,
            registration_record BLOB,
            auk_salt BLOB NOT NULL,
            key_enc BLOB NOT NULL,
            PRIMARY KEY (username)
        );
    """)

    # Populate the new table
    for row in conn.execute(sa.text("SELECT * FROM user")):
        if not isinstance(row.id, UUID):
            break

        conn.execute(
            sa.text(
                """
                INSERT INTO user_temp
                    (
                        username,
                        auth_protocol,
                        fsitem_id,
                        additional_info,
                        registration_record,
                        auk_salt,
                        key_enc
                    )
                VALUES
                    (
                        :username,
                        :auth_protocol,
                        :fsitem_id,
                        :additional_info,
                        :registration_record,
                        :auk_salt,
                        :key_enc
                    )
            """.replace("\n", " ")
            ).bindparams(
                username=row.username,
                auth_protocol=row.auth_protocol,
                fsitem_id=row.fsitem_id,
                additional_info=row.additional_info,
                registration_record=row.registration_record,
                auk_salt=row.auk_salt,
                key_enc=row.key_enc,
            )
        )

    # Drop the old table
    op.drop_table("user")

    # Rename the new table
    op.rename_table("user_temp", "user")
