from base64 import b64encode
from typing import Annotated

from fastapi import Body, Depends
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_session
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import get_user_from_id


class VaultInfo(BaseModel):
    keygen_function: str
    auk_salt: bytes
    key_enc: bytes
    vault_info: str

    @field_serializer("auk_salt", "key_enc")
    def serialize_binary(self, b: bytes, _info) -> str:
        return b64encode(b).decode("utf-8")


@encrypted_router.get(
    "/vault",
    summary="Get User Vault Info",
    dependencies=[Depends(get_credentials)],
    response_model=VaultInfo,
    tags=["encrypted"],
)
def get_user_vault_info_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Returns the vault info of the currently authenticated user.

    The Account Unlock Key (AUK) salt (`auk_salt`) and encrypted vault key (`key_enc`) are returned
    as Base64-encoded strings.

    The `vault_info` field contains additional _unencrypted_ information about the user's vault.
    """

    user = get_user_from_id(credentials.user_id)
    return VaultInfo.model_validate(user.model_dump())


@encrypted_router.put(
    "/vault",
    summary="Edit User Vault Info",
    dependencies=[Depends(get_credentials)],
    tags=["encrypted"],
)
def edit_user_vault_info_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)], info: Annotated[str, Body()]
):
    """
    Edits the additional information stored in the user's vault.

    The `auk_salt` and `key_enc` fields are not modified by this endpoint. Use the specialised
    `/api/auth/opaque/edit-record` WebSocket endpoint to edit them instead.
    """

    with get_session() as session:
        db_user = session.get(User, credentials.user_id)
        db_user.vault_info = info
        session.commit()
