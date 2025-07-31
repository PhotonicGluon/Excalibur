from typing import Annotated

from fastapi import Query
from semver.version import Version

from excalibur_server.api.v1.well_known import router
from excalibur_server.src.compatibility import check_compatibility


@router.get(
    "/compatible",
    summary="Check if the client version is compatible with the server version",
)
def compatible_endpoint(
    version: Annotated[str, Query(description="The client version to check")],
) -> bool:
    """
    Checks if the client version is compatible with the server version.
    """

    return check_compatibility(Version.parse(version))
