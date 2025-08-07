from typing import Annotated

from fastapi import HTTPException, Query, status
from semver.version import Version

from excalibur_server.api.routes.well_known import router
from excalibur_server.src.compatibility import check_compatibility


@router.get(
    "/compatible",
    summary="Check if the client version is compatible with the server version",
    responses={
        status.HTTP_200_OK: {
            "content": {
                "application/json": {
                    "examples": {
                        "Compatible Version": {"value": True},
                        "Incompatible Version": {"value": False},
                    },
                }
            },
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid Version"},
    },
)
def compatible_endpoint(
    version: Annotated[str, Query(description="The client version to check")],
) -> bool:
    """
    Checks if the client version is compatible with the server version.
    """

    try:
        parsed_version = Version.parse(version)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid version '{version}'")

    return check_compatibility(parsed_version)
