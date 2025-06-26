from typing import Annotated

from fastapi import Body, Depends, HTTPException, Response, Security, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from excalibur_server.api.v1.security import router
from excalibur_server.src.security.auth.token import (
    API_TOKEN_HEADER,
    check_credentials,
    decode_token,
    generate_auth_token,
)
from excalibur_server.src.security.cache import VALID_UUIDS_CACHE


class LoginResponse(BaseModel):
    token: str


@router.post(
    "/login",
    summary="Login",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Handshake UUID not found or has expired"},
    },
    response_model=LoginResponse,
    tags=["encrypted"],
)
def login_endpoint(
    handshake_uuid: Annotated[str, Body(description="Handshake UUID given by the server during the handshake.")],
    response: Response,
):
    """
    Logs in a user. Generates a token for continued authentication.

    Note that this is an **encrypted** endpoint. See the documentation under "encrypted" endpoints to learn how to decode the response.
    """

    # Get master key associated with handshake UUID
    master_key, expiry = VALID_UUIDS_CACHE.get(handshake_uuid, (None, None))
    if master_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handshake UUID not found or has expired")

    response.headers["uuid"] = handshake_uuid  # Used to help the middleware find the master key

    # Generate token for continued authentication
    token = generate_auth_token(handshake_uuid, expiry)
    return LoginResponse(token=token)


@router.post(
    "/logout",
    summary="Logout",
    dependencies=[Depends(check_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized or invalid token"}},
    response_model=str,
)
def logout_endpoint(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)):
    """
    Logs out a user.
    """

    decoded = decode_token(credentials.credentials)
    uuid = decoded.get("sub")
    VALID_UUIDS_CACHE.pop(uuid)

    return f"Logged out '{uuid}' successfully"
