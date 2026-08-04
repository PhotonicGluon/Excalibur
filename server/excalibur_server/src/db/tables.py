import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlmodel import Column, Enum, Field, LargeBinary, SQLModel, UniqueConstraint

from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.crypto.exef import ExEF


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    # Basic information
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str = Field(unique=True)
    fsitem_id: uuid.UUID = Field(nullable=True)  # TODO: Remove nullable in next version
    """
    ID of the user's root filesystem item.

    A `None` means that the user does not use a database-based filesystem. This is for legacy users
    who were created before the database-based filesystem was implemented, and meant for migration
    purposes.

    This is supposed to be a foreign key to the `FSItem` table, but DuckDB doesn't support creating
    foreign keys.
    """

    # Authentication info
    auth_protocol: AuthProtocol = Field(
        sa_column=Column(Enum(AuthProtocol), nullable=False, default=AuthProtocol.OPAQUE_3DH)
    )
    "Authentication protocol to use"

    # OPAQUE
    registration_record: bytes = Field(nullable=True)  # TODO: Set maximum length
    "Client's serialized registration record for use in the OPAQUE protocol"

    # Vault info
    keygen_algorithm: str = Field(nullable=False, default="argon2d")
    "Key generation function for the Account Unlock Key (AUK)"
    auk_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Account Unlock Key (AUK)"
    key_enc: bytes = Field(
        sa_column=Column(
            LargeBinary(length=ExEF.header_size + ExEF.footer_size + 32),  # 32 is actual key size
            nullable=False,
        )
    )
    """
    Encrypted vault key as an ExEF stream.
    The vault key should have been encrypted using the Account Unlock Key (AUK).
    """
    vault_info: str = Field(default="", nullable=False)
    "Additional information about the user's vault"


class FSItem(SQLModel, table=True):
    """
    A filesystem item (i.e., a file or directory) in the database.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    "Unique identifier for the filesystem item"
    parent_id: uuid.UUID | None = Field(nullable=True)
    """
    Parent directory ID, or None for a user's root folder.

    This is supposed to be a foreign key to the `id` column, but DuckDB doesn't support creating
    foreign keys.
    """
    root_id: uuid.UUID = Field(nullable=False)
    """
    Root directory ID.

    Will be itself for a user's root folder.

    This is supposed to be a foreign key to the `id` column, but DuckDB doesn't support creating
    foreign keys.
    """

    # Basic information
    name: str = Field(nullable=False)
    "Item name"
    is_folder: bool = Field(default=False, nullable=False)
    "Whether the item is a folder"

    # Metadata
    size: int | None = Field(nullable=True)
    "File size in bytes, or None for folders"
    timestamp: int = Field(nullable=False, default_factory=lambda: int(datetime.now(tz=UTC).timestamp()))
    "Creation timestamp of the item as *seconds* since the Unix epoch, in UTC"

    # Ensure no two items have the same name in the same folder
    __table_args__ = (UniqueConstraint("parent_id", "name", name="unique_parent_name"),)

    @property
    def system_path(self) -> Path:
        """
        Get the system path for this item. Only defined for files.

        :return: path to the file, relative to the base directory
        :raises NotImplementedError: if this is not a file
        """

        if self.is_folder:
            raise NotImplementedError("System path is only defined for files")

        file_id = str(self.id)
        level_1 = file_id[:2]
        level_2 = file_id[2:4]
        rest = file_id[4:]
        return Path(level_1, level_2, rest + ".exef")
