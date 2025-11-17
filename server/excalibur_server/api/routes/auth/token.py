from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG


def _gen_token(username: str, master_key: bytes, expiry_time: int):
    from datetime import datetime, timezone
    from uuid import uuid4

    from excalibur_server.api.cache import MASTER_KEYS_CACHE
    from excalibur_server.src.auth.credentials import generate_auth_token

    uuid = uuid4().hex
    MASTER_KEYS_CACHE[uuid] = master_key
    token = generate_auth_token(
        username,
        uuid,
        datetime.now(tz=timezone.utc).timestamp() + expiry_time,
    )

    return token


@router.get(
    "/token",
    name="Get New Token",
    responses={
        status.HTTP_200_OK: {
            "description": "Successful Response",
            "content": {"text/plain": {"example": "<JWT Token>"}},
        },
        status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"},
    },
    response_class=PlainTextResponse,
)
def get_token_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Gets a new authentication token for a logged-in user.

    Note that this invalidates the old token.
    """

    from excalibur_server.api.cache import MASTER_KEYS_CACHE

    if credentials.comm_uuid not in MASTER_KEYS_CACHE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Comm UUID not found in cache")
    master_key = MASTER_KEYS_CACHE.pop(credentials.comm_uuid)
    return _gen_token(credentials.username, master_key, CONFIG.security.session_duration)


@router.get("/generate-token", name="Generate Token", tags=["debug"], response_class=PlainTextResponse)
def generate_token_endpoint(
    username: Annotated[str, Query(description="The username to get the token for")],
    expiry_time: Annotated[int, Query(description="The expiry time of the token")] = CONFIG.security.session_duration,
    master_key: Annotated[str, Query(description="The master key to use for the token")] = "one demo 16B key",
):
    """
    Generate an authentication token for a user.
    """

    return _gen_token(username, master_key.encode("utf-8"), expiry_time)


@router.get("/generate-pop", name="Generate PoP", tags=["debug"], response_class=PlainTextResponse)
def generate_pop_endpoint(
    method: Annotated[str, Query(description="The method to use for the PoP")],
    path: Annotated[str, Query(description="The path to use for the PoP")],
    master_key: Annotated[str, Query(description="The master key to use for the token")] = "one demo 16B key",
):
    """
    Generate a PoP for a user.
    """

    import time

    from Crypto.Random import get_random_bytes

    from excalibur_server.src.auth.pop import generate_pop_header

    return generate_pop_header(master_key.encode("utf-8"), method, path, int(time.time()), get_random_bytes(16))
