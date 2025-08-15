from sqlmodel import Column, Field, LargeBinary, SQLModel


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    username: str = Field(primary_key=True)
    auk_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Account Unlock Key (AUK)"
    srp_salt: bytes = Field(sa_column=Column(LargeBinary(length=32), nullable=False))
    "Salt for the Secure Remote Password (SRP) protocol key"
    verifier: bytes = Field(nullable=False)
    "Verifier to prove server's identity in SRP"
    key_enc: bytes = Field(nullable=False)  # TODO: Set maximum length
    """
    Encrypted vault key as an ExEF stream.
    The vault key should have been encrypted using the Account Unlock Key (AUK).
    """
