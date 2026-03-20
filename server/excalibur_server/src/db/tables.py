from sqlmodel import Column, Enum, Field, LargeBinary, SQLModel

from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.srp.group import SRPGroup


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    # Basic information
    username: str = Field(primary_key=True)
    auth_protocol: int = Field(sa_column=Column(Enum(AuthProtocol), nullable=False, default=AuthProtocol.OPAQUE_3DH))
    "Authentication protocol to use"

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
