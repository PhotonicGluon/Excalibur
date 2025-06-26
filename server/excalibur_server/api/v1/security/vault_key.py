import binascii
from typing import Annotated

from fastapi import Body, Depends, HTTPException, status

from excalibur_server.api.v1.security import router
from excalibur_server.src.security.auth.token import check_credentials
from excalibur_server.src.security.vault_key import EncryptedVaultKey, check_vault_key, get_vault_key, set_vault_key


@router.head(
    "/vault-key",
    summary="Check Vault Key Details Existence",
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_200_OK: {"description": "Vault key file exists"},
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "Vault key file not found"},
    },
)
def check_vault_key_endpoint():
    """
    Endpoint that checks if the vault key file exists.
    """

    if not check_vault_key():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault key file not found")


@router.get(
    "/vault-key",
    summary="Get Vault Key Details",
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_404_NOT_FOUND: {"description": "Vault key file not found"},
    },
    response_model=EncryptedVaultKey,
    tags=["encrypted"],
)
def get_vault_key_endpoint():
    """
    Endpoint that returns the encrypted vault key as a Base64-encoded ExEF stream.
    """

    if not check_vault_key():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault key file not found")

    return get_vault_key()


@router.post(
    "/vault-key",
    summary="Set Vault Key Details",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_credentials)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
        status.HTTP_409_CONFLICT: {"description": "Vault key file already exists"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string"},
    },
    response_model=str,
    tags=["encrypted"],
)
def set_vault_key_endpoint(
    key_enc: Annotated[
        bytes,
        Body(
            description="Encrypted vault key as an ExEF stream. The vault key should have been encrypted using the Account Unlock Key (AUK)."
        ),
    ],
):
    """
    Endpoint that sets the vault key.
    """

    if check_vault_key():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vault key file already exists")

    try:
        set_vault_key(key_enc)
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid base64 string: {e}")

    return "Vault key set"
