from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """
    A user in the database.
    """

    username: str = Field(primary_key=True)
    auk_salt: bytes = Field(nullable=False)
    srp_salt: bytes = Field(nullable=False)
    verifier: bytes = Field(nullable=False)
    key_enc: bytes | None = Field(nullable=True)  # TODO: Remove nullable=True
