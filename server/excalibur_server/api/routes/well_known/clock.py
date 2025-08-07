from datetime import datetime

from fastapi import status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.well_known import router


@router.get(
    "/clock",
    summary="Get server time",
    responses={
        status.HTTP_200_OK: {
            "content": {"text/plain": {"example": "2012-03-04T05:06:07+08:09"}},
        },
    },
    response_class=PlainTextResponse,
)
async def clock_endpoint() -> str:
    """
    Gets the server's time as an ISO 8601 string.
    """

    time = datetime.now().astimezone()
    time = time.replace(microsecond=0)  # Remove fractional seconds
    return time.isoformat()
