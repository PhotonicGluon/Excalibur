from typing import Annotated

from fastapi import Depends, Header, Request, Response, status
from fastapi.exceptions import HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials

from excalibur_server.api.routes.well_known import router
from excalibur_server.src.auth.credentials import API_TOKEN_HEADER, get_credentials
from excalibur_server.src.auth.pop import POP_HEADER_PATTERN

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
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(API_TOKEN_HEADER)],
    hmac_validation: Annotated[
        str,
        Header(
            alias="X-SRP-PoP",
            pattern=POP_HEADER_PATTERN,
            description="HMAC for authentication.",
        ),
    ] = "",
    response: Response = ...,
) -> str:
    """
    Health check endpoint.

    Can include a HTTP `Bearer` header to check whether user is (still) authenticated or not.
    """

    response.headers.update(HEADERS)
    if credentials and hmac_validation:
        try:
            await get_credentials(request, hmac_validation, credentials)
            response.status_code = status.HTTP_202_ACCEPTED
            return "Auth OK"
        except HTTPException:
            pass

    return "OK"
