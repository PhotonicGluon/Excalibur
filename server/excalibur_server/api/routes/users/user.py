import binascii
import json
from base64 import b64decode, b64encode
from typing import Annotated

from Crypto.Cipher import AES
from fastapi import Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, field_serializer

from excalibur_server.api.misc import is_debug
from excalibur_server.api.routes.users import router
from excalibur_server.src.auth.credentials import get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.users import User, add_user, get_user, is_user, remove_user


class SecurityDetails(BaseModel):
    auk_salt: bytes
    srp_salt: bytes

    @field_serializer("auk_salt", "srp_salt")
    def serialize_salts(self, a_bytes: bytes, _info) -> str:
        return b64encode(a_bytes).decode("utf-8")

    @classmethod
    def from_base64s(cls, obj: dict[str, str]) -> "SecurityDetails":
        assert "auk_salt" in obj and "srp_salt" in obj
        return SecurityDetails(
            auk_salt=b64decode(obj["auk_salt"]),
            srp_salt=b64decode(obj["srp_salt"]),
        )


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


@router.post(
    "/add/{username}",
    summary="Add User",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {
            "description": "User set",
            "content": {"text/plain": {"example": "User added", "schema": None}},
        },
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Invalid account creation key (i.e., unable to decrypt the data)"
        },
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Invalid base64 string"},
        status.HTTP_409_CONFLICT: {"description": "User already exists"},
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid JSON/base64 string after decryption"},
    },
    response_class=PlainTextResponse,
)
def add_user_endpoint(
    username: Annotated[str, Path()],
    nonce: Annotated[str, Body(description="Base64 string of the nonce.")],
    enc_data: Annotated[str, Body(description="Base64 string of the encrypted data.")],
    tag: Annotated[str, Body(description="Base64 string of the tag.")],
):
    """
    Endpoint that enrols the verifier.

    Encrypt a JSON object using the Account Creation Key (ACK) with the following details:
    - `auk_salt`: Base64 string of the account unlock key (AUK) salt.
    - `srp_salt`: Base64 string of the SRP handshake salt.
    - `verifier`: Base64 string of the verifier to enrol.
    - `key_enc`: Base64 string of the encrypted vault key. The vault key should be encrypted using
        the AUK, not the ACK.

    Provide the nonce, encrypted data, and tag in the request body.
    """

    if is_user(username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    # Try decrypting the incoming data
    try:
        nonce = b64decode(nonce)
        enc_data = b64decode(enc_data)
        tag = b64decode(tag)
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail=f"Invalid base64 string: {e}")

    cipher = AES.new(CONFIG.security.account_creation_key, AES.MODE_GCM)
    user_data = cipher.decrypt(enc_data)
    if not cipher.verify(tag):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tag")

    # Parse the user data
    try:
        user_data = json.loads(user_data.decode("utf-8"))
        auk_salt = b64decode(user_data["auk_salt"])
        srp_salt = b64decode(user_data["srp_salt"])
        verifier = b64decode(user_data["verifier"])
        key_enc = b64decode(user_data["key_enc"])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON: {e}")
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 string: {e}")

    # Create the user
    try:
        user = User(
            username=username,
            auk_salt=auk_salt,
            srp_group=CONFIG.security.srp.group,
            srp_salt=srp_salt,
            srp_verifier=verifier,
            key_enc=key_enc,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{e}")

    add_user(user)
    return "User added"


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
