from typing import Annotated

from fastapi import Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials

from excalibur_server.api.v1.well_known import router
from excalibur_server.src.security.token import API_TOKEN_HEADER, check_auth_token

HEADERS = {"Cache-Control": "no-cache, no-store, must-revalidate", "Content-Type": "text/plain"}


@router.get(
    "/heartbeat",
    summary="Health check",
    responses={
        status.HTTP_200_OK: {
            "description": "Alive",
            "content": {
                "text/plain": {"example": "OK"},
                "application/json": None,
            },
        },
        status.HTTP_202_ACCEPTED: {"description": "Authenticated", "content": {"text/plain": {"example": "Auth OK"}}},
    },
    status_code=None,
)
async def heartbeat_endpoint(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(API_TOKEN_HEADER)],
    response: Response,
) -> str:
    """
    Health check endpoint.

    Can include a HTTP `Bearer` header to check whether user is (still) authenticated or not.
    """

    response.headers.update(HEADERS)
    if credentials and check_auth_token(credentials.credentials):
        response.status_code = status.HTTP_202_ACCEPTED
        return "Auth OK"

    return "OK"
