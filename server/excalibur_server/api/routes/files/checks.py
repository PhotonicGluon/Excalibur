from typing import Annotated

from fastapi import Depends, HTTPException, Path, Response, status

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_item_by_path, is_dir_empty
from excalibur_server.src.path import check_path_length, check_path_subdir
from excalibur_server.src.users import get_user


# Old implementation for legacy users
def _old_checkpath(path: str, username: str, response: Response):
    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, CONFIG.storage.vault_folder / username)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    # Check path length
    if not check_path_length(user_path):
        raise HTTPException(status_code=status.HTTP_414_URI_TOO_LONG, detail="Path too long")

    # Now we can check existence
    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    if user_path.is_file():
        response.status_code = status.HTTP_200_OK
        return

    response.status_code = status.HTTP_202_ACCEPTED


def _old_checkdir(path: str, username: str, response: Response):
    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, CONFIG.storage.vault_folder / username)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists() or not user_path.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = not any(user_path.iterdir())
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED


@encrypted_router.head(
    "/check/path/{path:path}",
    name="Check Existence",
    responses={
        status.HTTP_200_OK: {"description": "File exists", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Path too long"},
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
    username = credentials.username

    # Handle legacy users without flattened filesystem
    root_id = get_user(username).fsitem_id
    if root_id is None:
        return _old_checkpath(path, username, response)

    # Get item
    item = get_item_by_path(root_id, path)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    # Decide type of the item
    if item.is_folder:
        response.status_code = status.HTTP_202_ACCEPTED
        return

    response.status_code = status.HTTP_200_OK


@encrypted_router.head(
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
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    response: Response,
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Checks the existence of a directory, and whether it is empty.
    """

    path = processed_path
    username = credentials.username

    # Handle legacy users without flattened filesystem
    root_id = get_user(username).fsitem_id
    if root_id is None:
        return _old_checkdir(path, username, response)

    # Get item
    item = get_item_by_path(root_id, path)
    if not item or not item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = is_dir_empty(item.id)
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED
