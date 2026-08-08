import uuid
from base64 import b64encode
from datetime import UTC, datetime
from pathlib import Path
from typing import ClassVar

from pydantic import field_serializer
from sqlmodel import Column, Enum, Field, LargeBinary, SQLModel, UniqueConstraint

from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.misc import frame


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    # Basic information
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str = Field(unique=True)
    fsitem_id: uuid.UUID = Field(nullable=False)
    """
    ID of the user's root filesystem item.

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
            # 32 is the actual key size; sized for the ExEF v4 encoding, which is larger than the
            # legacy v3 encoding, so existing v3-encrypted keys still fit
            LargeBinary(length=ExEF.compute_encrypted_size(32, version=4)),
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

    # Integrity
    ciphertext_hash: bytes | None = Field(default=None, nullable=True)
    """
    Unkeyed BLAKE2b hash of the on-disk file, or None for folders and for files not yet migrated.
    
    Server-computed, for bit-rot scrubbing only. **Not** part of the Merkle tree.
    """

    content_mac: bytes | None = Field(nullable=True)
    """
    Keyed MAC binding this file's AEAD tags to its identity, or None for folders and for files not
    yet migrated.

    Computed by the client; the server never verifies it.
    """
    node_hash: bytes | None = Field(nullable=True)
    """
    Keyed MAC of the subtree rooted at this item, or None if the subtree is dirty or has not been
    migrated.
    """
    version: int = Field(nullable=False, default=1)
    """
    Monotonic counter bumped on every mutation to this node.

    This allows clients to detect changes without fully comparing the Merkle tree.
    """

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


class VaultState(SQLModel, table=True):
    """
    Contains the state of a user's vault.
    """

    root_id: uuid.UUID = Field(primary_key=True)
    """
    ID of the user's root filesystem item.

    This is supposed to be a foreign key to the `FSItem` table, but DuckDB doesn't support creating
    foreign keys.
    """
    merkle_status: MerkleStatus = Field(sa_column=Column(Enum(MerkleStatus), nullable=False, default=MerkleStatus.NONE))
    "Status of the Merkle tree for the vault."
    current_generation: int = Field(nullable=False, default=0)
    "Current generation of the vault."
    migrated_count: int = Field(nullable=False, default=0)
    "Number of items that have been migrated to the new generation."
    total_count: int | None = Field(nullable=True, default=None)
    "Total number of items in the vault."


class Attestation(SQLModel, table=True):
    """
    An attestation of a user's vault state.
    """

    ATTESTATION_EPOCH: ClassVar[bytes] = b"Excalibur Merkle v1"

    root_id: uuid.UUID = Field(primary_key=True)
    """
    ID of the tree root that this is attesting.

    This is supposed to be a foreign key to the `FSItem` table, but DuckDB doesn't support creating
    foreign keys.
    """
    generation: int = Field(primary_key=True)
    "Generation of the vault."
    root_hash: bytes = Field(nullable=False)
    "Merkle root hash of the tree."
    prev_root_hash: bytes | None = Field(nullable=True)
    "Previous root hash, or None for the first generation."
    timestamp: int = Field(nullable=False)
    "Timestamp when this root was generated"
    tag: bytes = Field(nullable=False)
    "Tag for this root"

    @property
    def attestation(self) -> bytes:
        """
        Get the attestation for this root.

        :returns: the attestation bytes
        """

        return self.ATTESTATION_EPOCH + frame(
            self.root_id.bytes,
            self.generation.to_bytes(8, "big"),
            self.root_hash,
            self.prev_root_hash or b"",
            self.timestamp.to_bytes(8, "big"),
        )

    # Field serialization
    @field_serializer("root_hash", "prev_root_hash", "tag")
    def serialize_bytes(self, value: bytes | None) -> str | None:
        if value is None:
            return None
        return b64encode(value).decode("utf-8")

    @field_serializer("root_id")
    def serialize_uuid(self, value: uuid.UUID) -> str:
        return str(value)
