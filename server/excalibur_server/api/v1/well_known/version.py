from fastapi import status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.meta import VERSION
from excalibur_server.api.v1.well_known import router


@router.get(
    "/version",
    summary="Get server version",
    responses={
        status.HTTP_200_OK: {
            "content": {"text/plain": {"example": VERSION}},
        },
    },
    response_class=PlainTextResponse,
)
async def version_endpoint() -> str:
    """
    Returns the version of the server.
    """

    return VERSION
