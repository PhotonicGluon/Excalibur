import binascii
from typing import Annotated

from fastapi import Body, Depends, HTTPException, status

from excalibur_server.api.v1.security.auth.token import check_credentials
from excalibur_server.api.v1.security.routes import router
from excalibur_server.api.v1.security.vault_key import VAULT_KEY_FILE, EncryptedVaultKey, get_vault_key, set_vault_key


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

    if not VAULT_KEY_FILE.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault key file not found")


# TODO: The routes below need to be encrypted


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
    Endpoint that returns the vault key.
    """

    if not VAULT_KEY_FILE.exists():
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
    alg: Annotated[
        str,
        Body(description="The algorithm used to encrypt the vault key."),
    ],
    nonce: Annotated[
        str,
        Body(description="Base64 string of the nonce used to encrypt the vault key."),
    ],
    key_enc: Annotated[
        str,
        Body(
            description="Base64 string of the **encrypted** vault key. The vault key should have been encrypted using the Account Unlock Key (AUK)."
        ),
    ],
    tag: Annotated[
        str,
        Body(description="Base64 string of the tag used to encrypt the vault key."),
    ],
):
    """
    Endpoint that sets the vault key.
    """

    if VAULT_KEY_FILE.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vault key file already exists")

    try:
        set_vault_key(
            EncryptedVaultKey.from_base64s({"alg": alg, "nonce": nonce, "key_enc": key_enc, "tag": tag}),
        )
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid base64 string: {e}")

    return "Vault key set"
