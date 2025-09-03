from pathlib import Path as PathlibPath
from typing import Annotated

from fastapi import Depends, HTTPException, Path, Query, Response, status

from excalibur_server.api.routes.files import router
from excalibur_server.src.auth.token import get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_length, check_path_subdir


@router.head(
    "/check/path/{path:path}",
    name="Check Existence",
    responses={
        status.HTTP_200_OK: {"description": "File exists", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_414_REQUEST_URI_TOO_LONG: {"description": "Path too long"},
    },
)
async def check_path_endpoint(
    username: Annotated[str, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
):
    """
    Checks the existence of a file or directory.
    """

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(PathlibPath(username) / path, CONFIG.server.vault_folder)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    # Check path length
    if not check_path_length(user_path):
        raise HTTPException(status_code=status.HTTP_414_REQUEST_URI_TOO_LONG, detail="Path too long")

    # Now we can check existence
    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    if user_path.is_file():
        response.status_code = status.HTTP_200_OK
        return

    response.status_code = status.HTTP_202_ACCEPTED


@router.head(
    "/check/size",
    name="Check File Size",
    responses={
        status.HTTP_200_OK: {"description": "File size acceptable", "content": None},
        status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE: {"description": "File size too large"},
    },
)
async def check_file_size_endpoint(
    size: Annotated[int, Query(description="The size of the file to check", ge=0)],
    response: Response,
):
    """
    Checks whether the given file size is acceptable.
    """

    if size > CONFIG.server.max_file_size:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="File size too large")

    response.status_code = status.HTTP_200_OK


@router.head(
    "/check/dir/{path:path}",
    name="Check Directory Type",
    responses={
        status.HTTP_200_OK: {"description": "Directory exists and is empty", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists and is not empty"},
        status.HTTP_404_NOT_FOUND: {"description": "Directory not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
)
async def check_dir_endpoint(
    username: Annotated[str, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
):
    """
    Checks the existence of a directory, and whether it is empty.
    """

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(PathlibPath(username) / path, CONFIG.server.vault_folder)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists() or not user_path.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = not any(user_path.iterdir())
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED
