from base64 import b64encode
from typing import Annotated

from fastapi import Body, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.security import router
from excalibur_server.src.db.operations import get_vault_key, is_vault_key, set_vault_key
from excalibur_server.src.security.token import check_credentials

# TODO: Check if this module is redundant


@router.head(
    "/vault-key",
    summary="Check Vault Key Details Existence",
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_200_OK: {
            "description": "Vault key exists",
            "content": None,
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "Vault key not found"},
    },
)
def check_vault_key_endpoint():
    """
    Endpoint that checks if the vault key exists.
    """

    if not is_vault_key():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault key not found")


@router.get(
    "/vault-key",
    summary="Get Vault Key Details",
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "Vault key not found"},
    },
    tags=["encrypted"],
)
def get_vault_key_endpoint():
    """
    Endpoint that returns the encrypted vault key as an ExEF stream.
    """

    if not is_vault_key():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault key not found")

    return {"key_enc": b64encode(get_vault_key()).decode("utf-8")}  # TODO: Change


@router.post(
    "/vault-key",
    summary="Set Vault Key Details",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_201_CREATED: {
            "description": "Vault key set",
            "content": {"text/plain": {"example": "Vault key set", "schema": None}},
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_409_CONFLICT: {"description": "Vault key already exists"},
    },
    response_class=PlainTextResponse,
    tags=["encrypted"],
)
def set_vault_key_endpoint(
    key_enc: Annotated[
        bytes,
        Body(
            description="Encrypted vault key as an ExEF stream."
            "The vault key should have been encrypted using the Account Unlock Key (AUK).",
            media_type="application/octet-stream",
        ),
    ],
):
    """
    Endpoint that sets the vault key.
    """

    if is_vault_key():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vault key already exists")

    set_vault_key(key_enc)

    return "Vault key set"
