import mimetypes
import uuid
from time import time

from sqlmodel import Column, Enum, Field, LargeBinary, SQLModel, UniqueConstraint

from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.srp.group import SRPGroup


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    # Basic information
    username: str = Field(primary_key=True)
    auth_protocol: AuthProtocol = Field(
        sa_column=Column(Enum(AuthProtocol), nullable=False, default=AuthProtocol.OPAQUE_3DH)
    )
    "Authentication protocol to use"
    fsitem_id: uuid.UUID = Field(nullable=True)  # TODO: Remove nullable in next version
    """
    ID of the user's root filesystem item.

    A `None` means that the user does not use a database-based filesystem. This is for legacy users
    who were created before the database-based filesystem was implemented, and meant for migration
    purposes.

    This is supposed to be a foreign key to the `FSItem` table, but DuckDB doesn't support creating
    foreign keys.
    """
    obfuscated_names: bool = Field(default=True)
    "Whether the file and folder names are obfuscated"

    # Secure Remote Password (SRP)
    # TODO: Deprecate SRP fields in next version
    srp_group: SRPGroup = Field(sa_column=Column(Enum(SRPGroup), nullable=True))
    "Secure Remote Password (SRP) group to use for authentication"
    srp_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=True))
    "Salt for the SRP protocol key"
    srp_verifier: bytes = Field(nullable=True)
    "Verifier to prove server's identity in SRP"

    # OPAQUE
    registration_record: bytes = Field(nullable=True)  # TODO: Set maximum length
    "Client's serialized registration record for use in the OPAQUE protocol"

    # Vault key
    auk_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Account Unlock Key (AUK)"
    key_enc: bytes = Field(nullable=False)  # TODO: Set maximum length
    """
    Encrypted vault key as an ExEF stream.
    The vault key should have been encrypted using the Account Unlock Key (AUK).
    """


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
    timestamp: int = Field(nullable=False, default_factory=lambda: int(time()))
    "Creation timestamp of the item"

    # Ensure no two items have the same name in the same folder
    __table_args__ = (UniqueConstraint("parent_id", "name", name="unique_parent_name"),)

    @property
    def mimetype(self) -> str | None:
        """
        :returns: MIME type of the file, or None for folders
        """

        if self.is_folder:
            return None

        mimetype, _ = mimetypes.guess_type(self.name.removesuffix(".exef"), strict=True)
        return mimetype
