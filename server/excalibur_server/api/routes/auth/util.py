from typing import Annotated

from fastapi import Query
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.config import CONFIG


@router.get("/token", tags=["debug"], response_class=PlainTextResponse)
def get_token_endpoint(
    username: Annotated[str, Query(description="The username to get the token for")],
    expiry_time: Annotated[int, Query(description="The expiry time of the token")] = CONFIG.api.login_validity_time,
) -> str:
    """
    Gets the authentication token for a user.
    """

    from datetime import datetime, timezone
    from uuid import uuid4

    from excalibur_server.src.auth.token.auth import generate_auth_token

    uuid = uuid4().hex
    token = generate_auth_token(
        username,
        uuid,
        datetime.now(tz=timezone.utc).timestamp() + expiry_time,
    )

    return token
