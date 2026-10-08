from typing import Annotated

from fastapi import Body, Depends, HTTPException, Path, Response, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_by_path, is_dir_empty
from excalibur_server.src.users import get_user_from_id


@encrypted_router.head(
    "/check/path/{path:path}",
    name="Check Existence",
    responses={
        status.HTTP_200_OK: {"description": "File exists", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found"},
    },
)
async def check_path_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Checks the existence of a file or directory.
    """

    path = processed_path
    user_id = credentials.user_id

    # Get item
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_item_by_path(root_id, path)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    # Decide type of the item
    if item.is_folder:
        response.status_code = status.HTTP_202_ACCEPTED
        return

    response.status_code = status.HTTP_200_OK


@encrypted_router.post(
    "/check/paths",
    name="Check Existence of Multiple Paths",
    responses={
        status.HTTP_200_OK: {"content": {"text/plain": {"example": "10010111"}}},
    },
    response_class=PlainTextResponse,
)
async def check_paths_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    paths: Annotated[list[str], Body(description="The paths to check (use `.` to specify root directory)")],
):
    """
    Checks the existence of multiple paths.

    The return value is a string of `1`s and `0`s, where `1` means the path exists and `0` means it
    does not. The order corresponds to the order of the paths in the request.
    """

    user_id = credentials.user_id
    root_id = get_user_from_id(user_id).fsitem_id

    output = ""
    for path in paths:
        exists = get_item_by_path(root_id, path) is not None
        output += "1" if exists else "0"

    return output


@encrypted_router.head(
    "/check/dir/{path:path}",
    name="Check Directory Type",
    responses={
        status.HTTP_200_OK: {"description": "Directory exists and is empty", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists and is not empty"},
        status.HTTP_404_NOT_FOUND: {"description": "Directory not found"},
    },
)
async def check_dir_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Checks the existence of a directory, and whether it is empty.
    """

    path = processed_path
    user_id = credentials.user_id

    # Get item
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_item_by_path(root_id, path)
    if not item or not item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = is_dir_empty(item.id)
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED
