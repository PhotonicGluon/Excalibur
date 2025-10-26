from typing import Annotated

from fastapi import Depends, Query
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import get_credentials
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


@router.get("/token", name="Get New Token")
def get_token_endpoint(credential: Annotated[str, Depends(get_credentials)]):
    """
    Gets a new authentication token for a logged-in user.
    """

    # TODO: Add
    print(credential)
    return credential


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
