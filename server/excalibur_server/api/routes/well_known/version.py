from pydantic import BaseModel

from excalibur_server.api.routes.well_known import router
from excalibur_server.meta import COMMIT, VERSION


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
