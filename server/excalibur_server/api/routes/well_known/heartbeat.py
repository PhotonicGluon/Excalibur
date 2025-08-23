from typing import Annotated

from fastapi import Depends, Response, status
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials

from excalibur_server.api.routes.well_known import router
from excalibur_server.src.security.token import API_TOKEN_HEADER, check_auth_token

HEADERS = {"Cache-Control": "no-cache, no-store, must-revalidate", "Content-Type": "text/plain"}


@router.head("/heartbeat", name="Health Check")
@router.get(
    "/heartbeat",
    name="Health Check",
    responses={
        status.HTTP_200_OK: {
            "description": "Alive",
            "content": {"text/plain": {"example": "OK", "schema": None}},
        },
        status.HTTP_202_ACCEPTED: {"description": "Authenticated", "content": {"text/plain": {"example": "Auth OK"}}},
    },
    status_code=None,
    response_class=PlainTextResponse,
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
