from typing import Annotated

from fastapi import Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials

from excalibur_server.api.v1.well_known import router
from excalibur_server.src.security.token import API_TOKEN_HEADER, check_auth_token

DEFAULT_RESPONSE = Response(
    content=None,
    status_code=status.HTTP_200_OK,
    headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
)


@router.head(
    "/heartbeat",
    summary="Health check endpoint",
    responses={
        status.HTTP_200_OK: {"description": "Alive"},
        status.HTTP_202_ACCEPTED: {"description": "Authenticated"},
    },
)
async def heartbeat_endpoint(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(API_TOKEN_HEADER)],
) -> Response:
    """
    Health check endpoint.

    Can include a HTTP `Bearer` header to check whether user is still authenticated or not.
    """

    response = DEFAULT_RESPONSE
    if credentials and check_auth_token(credentials.credentials):
        response.status_code = status.HTTP_202_ACCEPTED

    return response
