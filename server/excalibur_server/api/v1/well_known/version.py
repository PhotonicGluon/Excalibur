from excalibur_server.api.meta import VERSION
from excalibur_server.api.v1.well_known import router


@router.get(
    "/version",
    summary="Get server version",
    response_model=str,
)
async def version_endpoint() -> str:
    """
    Returns the version of the server.
    """

    return VERSION
