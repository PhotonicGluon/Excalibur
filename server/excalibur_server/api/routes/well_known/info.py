from datetime import datetime

from fastapi import status
from pydantic import BaseModel

from excalibur_server.api.routes.well_known import router
from excalibur_server.meta import VERSION
from excalibur_server.src.config import CONFIG


class ServerInfoResponse(BaseModel):
    version: str
    max_upload_size: int
    time: str


@router.get(
    "/info",
    name="Get Server Info",
    responses={
        status.HTTP_200_OK: {
            "content": {
                "application/json": {
                    "example": {
                        "version": "0.1.2",
                        "max_upload_size": 1_234_567,
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

    The returned information are:
    - `version`: SemVer of the server
    - `max_upload_size`: Maximum allowed file size in bytes
    - `time`: ISO 8601 string of the server's current time
    """

    time = datetime.now().astimezone()
    time = time.replace(microsecond=0)  # Remove fractional seconds

    return ServerInfoResponse(
        version=VERSION,
        max_upload_size=CONFIG.storage.max_upload_size,
        time=time.isoformat(),
    )
