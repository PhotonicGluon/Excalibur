from excalibur_server.api.meta import VERSION, COMMIT
from excalibur_server.api.v1.well_known import router
from pydantic import BaseModel


class VersionResponse(BaseModel):
    version: str
    commit: str | None


@router.get(
    "/version",
    summary="Get server version",
)
async def version_endpoint() -> VersionResponse:
    """
    Returns the version (and commit) of the server.
    """

    return VersionResponse(version=VERSION, commit=COMMIT)
