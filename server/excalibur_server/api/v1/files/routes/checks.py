from typing import Annotated

from fastapi import HTTPException, Path, Response, status

from excalibur_server.api.v1.files.routes import router
from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.path import validate_path


@router.head(
    "/check/path/{path:path}",
    name="Check Existence",
    responses={
        status.HTTP_200_OK: {"description": "File exists"},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
)
async def check_path_endpoint(
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
):
    """
    Checks the existence of a file or directory.
    """

    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    if user_path.is_file():
        response.status_code = status.HTTP_200_OK
        return

    response.status_code = status.HTTP_202_ACCEPTED


@router.head(
    "/check/dir/{path:path}",
    name="Check Directory Type",
    responses={
        status.HTTP_200_OK: {"description": "Directory exists and is empty"},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists and is not empty"},
        status.HTTP_404_NOT_FOUND: {"description": "Directory not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
)
async def check_dir_endpoint(
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
):
    """
    Checks the existence of a directory, and whether it is empty.
    """

    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists() or not user_path.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = not any(user_path.iterdir())
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED
