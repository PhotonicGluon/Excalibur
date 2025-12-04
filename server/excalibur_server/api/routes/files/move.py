import os
from pathlib import Path as PathlibPath
from typing import Annotated, Literal

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_length, check_path_subdir


def _move_helper(
    background_tasks: BackgroundTasks,
    credentials: Credentials,
    modification_type: Literal["move", "rename"],
    path: str,
    new_folder: PathlibPath | None,
    new_name: str,
):
    """
    Helper method for moving or renaming a file or directory.

    :param background_tasks: The background tasks to add the folder change to
    :param credentials: The credentials of the user
    :param modification_type: The type of modification to perform
    :param path: The path of the file or directory to move or rename
    :param new_folder: The new location of the file or directory, or None to keep in current
        location
    :param new_name: The new name of the file or directory
    :raises HTTPException: If the given path leads to a path traversal
    :raises HTTPException: If the given path does not exist
    :raises HTTPException: If the given path refers to the root directory
    :raises HTTPException: If the new path leads to a path traversal
    :raises HTTPException: If the new path is too long
    :raises HTTPException: If the new path already exists
    """

    username = credentials.username
    base_path = CONFIG.storage.vault_folder / username

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, base_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Check if user is trying to rename root directory
    if user_path == CONFIG.storage.vault_folder / PathlibPath(username):
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED, detail=f"Cannot {modification_type} root directory"
        )

    # Check if new folder exists
    if new_folder is None:
        new_folder = user_path.parent

    # Check for any attempts at path traversal again
    new_path, valid = check_path_subdir(new_folder / new_name, base_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    # Check new file path length
    if not check_path_length(new_path):
        raise HTTPException(status_code=status.HTTP_414_URI_TOO_LONG, detail="File path too long")

    # Check if file already exists
    if new_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    # Rename the file
    try:
        user_path.rename(new_path)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")
    background_tasks.add_task(add_folder_change, credentials, str(user_path.relative_to(base_path).parent))


@encrypted_router.post(
    "/move/{path:path}",
    name="Move Item",
    responses={
        status.HTTP_200_OK: {
            "description": "Item moved",
            "content": {"text/plain": {"example": "Item moved", "schema": None}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Item/destination not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot move root directory"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Path too long"},
    },
    response_class=PlainTextResponse,
)
async def move_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The item to move")],
    new_location: Annotated[str, Body(description="The directory containing the item")],
):
    """
    Moves a file or directory.

    Cannot move root directory (`.`).
    """

    _move_helper(background_tasks, credentials, "move", path, PathlibPath(new_location), os.path.basename(path))
    return "Item moved"
