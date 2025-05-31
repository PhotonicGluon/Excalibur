from typing import Annotated

from fastapi import Body, HTTPException, Response, status
from pydantic import BaseModel

from excalibur_server.api.v1.security.auth.token import generate_auth_token
from excalibur_server.api.v1.security.cache import VALID_UUIDS_CACHE
from excalibur_server.api.v1.security.routes import router


class AuthTokenResponse(BaseModel):
    token: str


@router.post(
    "/generate-token",
    summary="Generate Token",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Handshake UUID not found or has expired"},
    },
    response_model=AuthTokenResponse,
    tags=["encrypted"],
)
def generate_token_endpoint(
    handshake_uuid: Annotated[str, Body(description="Handshake UUID given by the server during the handshake.")],
    response: Response,
):
    """
    Generates a token for continued authentication.

    Note that this is an **encrypted** endpoint. See the documentation under "encrypted" endpoints to learn how to decode the response.
    """

    # Get master key associated with handshake UUID
    master_key = VALID_UUIDS_CACHE.get(handshake_uuid)
    if master_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handshake UUID not found or has expired")

    response.headers["uuid"] = handshake_uuid  # Used to help the middleware find the master key

    # Generate token for continued authentication
    token = generate_auth_token(handshake_uuid)
    return AuthTokenResponse(token=token)
