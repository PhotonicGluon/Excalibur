import binascii
from base64 import b64decode, b64encode
from typing import Annotated

from fastapi import Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import router
from excalibur_server.src.security.token import get_credentials
from excalibur_server.src.users import User, add_user, get_user, is_user


class SecurityDetails(BaseModel):
    auk_salt: bytes
    srp_salt: bytes

    @field_serializer("auk_salt", "srp_salt")
    def serialize_salts(self, a_bytes: bytes, _info) -> str:
        return b64encode(a_bytes).decode("utf-8")

    @classmethod
    def from_base64s(cls, obj: dict[str, str]) -> "SecurityDetails":
        assert "auk_salt" in obj and "srp_salt" in obj
        return SecurityDetails(auk_salt=b64decode(obj["auk_salt"]), srp_salt=b64decode(obj["srp_salt"]))


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
def check_user_endpoint(username: Annotated[str, Path(description="The username to check")]):
    """
    Endpoint that checks if the user exists.
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
def get_user_security_endpoint(username: Annotated[str, Path(description="The username to get security details for")]):
    """
    Endpoint that returns the user security details.
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
def get_user_vault_endpoint(username: Annotated[str, Path(description="The username to get vault key for")]):
    """
    Endpoint that returns the user vault key.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return EncryptedVaultKey(key_enc=user.key_enc)


# TODO: Should we secure this endpoint?
@router.post(
    "/add/{username}",
    summary="Add User",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {
            "description": "User set",
            "content": {"text/plain": {"example": "User added", "schema": None}},
        },
        status.HTTP_409_CONFLICT: {"description": "User already exists"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string"},
    },
    response_class=PlainTextResponse,
)
def add_user_endpoint(
    username: Annotated[str, Path(description="The username to add")],
    auk_salt: Annotated[str, Body(description="Base64 string of the account unlock key (AUK) salt.")],
    srp_salt: Annotated[str, Body(description="Base64 string of the SRP handshake salt.")],
    verifier: Annotated[str, Body(description="Base64 string of the verifier to enrol.")],
    key_enc: Annotated[str, Body(description="Base64 string of the encrypted vault key.")],
):
    """
    Endpoint that enrols the verifier.
    """

    if is_user(username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    try:
        auk_salt = b64decode(auk_salt)
        srp_salt = b64decode(srp_salt)
        verifier = b64decode(verifier)
        key_enc = b64decode(key_enc)
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid base64 string: {e}")

    try:
        user = User(username=username, auk_salt=auk_salt, srp_salt=srp_salt, verifier=verifier, key_enc=key_enc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{e}")

    add_user(user)
    return "User added"
