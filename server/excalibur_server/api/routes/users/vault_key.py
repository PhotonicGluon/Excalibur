from base64 import b64encode
from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import encrypted_router
from excalibur_server.src.auth.credentials import get_credentials
from excalibur_server.src.users import get_user, is_user


class EncryptedVaultKey(BaseModel):
    key_enc: bytes

    @field_serializer("key_enc")
    def serialize_encryption_stuff(self, b: bytes, _info) -> str:
        return b64encode(b).decode("utf-8")


@encrypted_router.get(
    "/vault/{username}",
    summary="Get User Vault Key",
    dependencies=[Depends(get_credentials)],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    response_model=EncryptedVaultKey,
    tags=["encrypted"],
)
def get_user_vault_key_endpoint(username: Annotated[str, Path()]):
    """
    Returns the vault key of a user with the specified username.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return EncryptedVaultKey(key_enc=user.key_enc)
