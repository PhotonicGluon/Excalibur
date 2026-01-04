from datetime import datetime

from fastapi import status
from pydantic import BaseModel

from excalibur_server.api.routes.well_known import router
from excalibur_server.meta import VERSION


class ServerInfoResponse(BaseModel):
    version: str
    time: str


@router.get(
    "/info",
    name="Get Server Info",
    responses={
        status.HTTP_200_OK: {
            "content": {
                "application/json": {
                    "example": {
                        "version": VERSION,
                        "time": "2012-03-04T05:06:07+08:09",
                    }
                }
            },
        },
    },
)
async def info_endpoint() -> ServerInfoResponse:
    """
    Gets the server's information.
    """

    # Get server current time as well
    time = datetime.now().astimezone()
    time = time.replace(microsecond=0)  # Remove fractional seconds

    return ServerInfoResponse(
        version=VERSION,
        time=time.isoformat(),
    )
