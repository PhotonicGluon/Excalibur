from pydantic import Base64Bytes
from sqlmodel import Field, SQLModel


class AttestationBase(SQLModel):
    """
    An attestation of a user's vault state without the tree root that it attests (tree root is determined by server).
    """

    generation: int = Field(nullable=False)
    "Generation of the vault"
    root_hash: Base64Bytes = Field(nullable=False)
    "Merkle root hash of the tree"
    prev_root_hash: Base64Bytes | None = Field(default=None, nullable=True)
    "Previous root hash, or None for the first generation"
    timestamp: int = Field(nullable=False)
    "Timestamp when this root was generated"
    tag: Base64Bytes = Field(nullable=False)
    "Tag for this root"
