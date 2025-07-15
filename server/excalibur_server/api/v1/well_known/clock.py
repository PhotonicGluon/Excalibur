from datetime import datetime

from excalibur_server.api.v1.well_known import router


@router.get(
    "/clock",
    summary="Get server time",
    response_model=str,
)
async def clock_endpoint() -> str:
    """
    Gets the server's time as an ISO 8601 string.
    """

    time = datetime.now().astimezone()
    return time.isoformat()
