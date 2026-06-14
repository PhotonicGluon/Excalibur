from base64 import b64encode
from typing import Annotated

from fastapi import Depends
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.users import get_user_from_id


class EncryptedVaultKey(BaseModel):
    key_enc: bytes

    @field_serializer("key_enc")
    def serialize_encryption_stuff(self, b: bytes, _info) -> str:
        return b64encode(b).decode("utf-8")


@encrypted_router.get(
    "/vault",
    summary="Get User Vault Key",
    dependencies=[Depends(get_credentials)],
    response_model=EncryptedVaultKey,
    tags=["encrypted"],
)
def get_user_vault_key_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Returns the vault key of the currently authenticated user.
    """

    user = get_user_from_id(credentials.user_id)
    return EncryptedVaultKey(key_enc=user.key_enc)
