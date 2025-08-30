from sqlmodel import Column, Enum, Field, LargeBinary, SQLModel

from excalibur_server.src.security.srp.group import SRPGroup


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    username: str = Field(primary_key=True)
    auk_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Account Unlock Key (AUK)"
    srp_group: SRPGroup = Field(sa_column=Column(Enum(SRPGroup)))
    "SRP group to use for authentication"
    srp_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Secure Remote Password (SRP) protocol key"
    srp_verifier: bytes = Field(nullable=False)
    "Verifier to prove server's identity in SRP"
    key_enc: bytes = Field(nullable=False)
    """
    Encrypted vault key as an ExEF stream.
    The vault key should have been encrypted using the Account Unlock Key (AUK).
    """


class FSNameable(SQLModel, table=True):
    """
    A filesystem nameable (e.g., a file or folder).
    """

    uuid: str = Field(primary_key=True)
    "UUID of the nameable"
    name: str = Field(nullable=False)
    "Real name of the nameable"

    @property
    def fs_name(self) -> str:
        """
        Returns the name of the nameable in the file system.
        """
        return self.uuid
