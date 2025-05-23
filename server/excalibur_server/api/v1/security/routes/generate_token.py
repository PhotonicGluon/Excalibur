from base64 import b64encode
from typing import Annotated

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from fastapi import Body, HTTPException, status
from pydantic import BaseModel

from excalibur_server.api.v1.security.auth.token import generate_token
from excalibur_server.api.v1.security.cache import VALID_UUIDS_CACHE
from excalibur_server.api.v1.security.routes import router


class AuthTokenResponse(BaseModel):
    token_enc: str
    nonce: str


@router.post(
    "/generate-token",
    summary="Generate Token",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Handshake UUID not found or has expired"},
    },
)
def generate_token_endpoint(
    handshake_uuid: Annotated[str, Body(description="Handshake UUID given by the server during the handshake.")],
):
    """
    Generates a token for continued authentication.
    """

    # Get master key associated with handshake UUID
    master_key = VALID_UUIDS_CACHE.get(handshake_uuid)
    if master_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handshake UUID not found or has expired")

    # Generate token for continued authentication
    token = generate_token({"valid": True})  # TODO: Do we need more stuff?

    # Encrypt using master key, which should be the same on client
    nonce = get_random_bytes(16)
    token_enc = AES.new(master_key, AES.MODE_GCM, nonce=nonce).encrypt(token.encode("UTF-8"))
    return AuthTokenResponse(token_enc=b64encode(token_enc).decode("UTF-8"), nonce=b64encode(nonce).decode("UTF-8"))
