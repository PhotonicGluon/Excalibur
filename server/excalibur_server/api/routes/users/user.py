from base64 import b64decode, b64encode
from typing import Annotated

from fastapi import Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import router
from excalibur_server.env import is_debug
from excalibur_server.src.auth.credentials import get_credentials
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.users import User, get_user, is_user, remove_user


class SecurityDetails(BaseModel):
    auk_salt: bytes
    auth_protocol: AuthProtocol

    @field_serializer("auk_salt")
    def serialize_salts(self, b: bytes | None, _info) -> str | None:
        if b is None:
            return None
        return b64encode(b).decode("utf-8")


class EncryptedVaultKey(BaseModel):
    key_enc: bytes

    @field_serializer("key_enc")
    def serialize_encryption_stuff(self, a_bytes: bytes, _info) -> str:
        return b64encode(a_bytes).decode("utf-8")

    @classmethod
    def from_serialized(cls, obj: dict[str, str]) -> "EncryptedVaultKey":
        assert "key_enc" in obj
        return EncryptedVaultKey(key_enc=b64decode(obj["key_enc"]))


@router.head(
    "/check/{username}",
    summary="Check User Existence",
    responses={
        status.HTTP_200_OK: {"description": "User exists", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
)
def check_user_endpoint(username: Annotated[str, Path()]):
    """
    Checks if a user with the specified username exists in the database.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return


@router.get(
    "/security/{username}",
    summary="Get User Security Details",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    response_model=SecurityDetails,
)
def get_user_security_details_endpoint(username: Annotated[str, Path()]):
    """
    Returns the security details of a user with the specified username.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return SecurityDetails.model_validate(user.model_dump())


@router.get(
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


@router.get(
    "/info/{username}",
    summary="Get Additional User Info",
    dependencies=[Depends(get_credentials)],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    tags=["encrypted"],
    response_class=PlainTextResponse,
)
def get_additional_user_info_endpoint(username: Annotated[str, Path()]):
    """
    Returns the additional user info of a user with the specified username.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return user.additional_info


@router.post(
    "/edit-info/{username}",
    summary="Edit Additional User Info",
    dependencies=[Depends(get_credentials)],
    responses={
        status.HTTP_200_OK: {"description": "User info updated", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    tags=["encrypted"],
)
def edit_additional_user_info_endpoint(username: Annotated[str, Path()], info: Annotated[str, Body()]):
    """
    Edits the additional user info of a user with the specified username.
    """

    with get_session() as session:
        curr_user = session.query(User).filter(User.username == username).first()
        if curr_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        curr_user.additional_info = info
        session.commit()


if is_debug():
    # Include this endpoint only in debug mode
    @router.delete(
        "/remove/{username}",
        name="Remove User",
        tags=["debug"],
        response_class=PlainTextResponse,
    )
    def remove_user_endpoint(username: Annotated[str, Path()]):
        """
        Removes a user from the database.
        """

        if not is_user(username):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        remove_user(username)
        return "User removed"
