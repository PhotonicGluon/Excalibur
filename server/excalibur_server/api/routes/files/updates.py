from pathlib import Path as PathlibPath
from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_length, check_path_subdir


@encrypted_router.post(
    "/rename/{path:path}",
    name="Rename Item",
    responses={
        status.HTTP_200_OK: {
            "description": "Item renamed",
            "content": {"text/plain": {"example": "Item renamed", "schema": None}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Path too long"},
    },
    response_class=PlainTextResponse,
)
async def rename_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to check (use `.` to specify root directory)")],
    new_name: Annotated[str, Body(description="The new name for the item at the leaf of the path")],
):
    """
    Renames a file or directory.
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
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot rename root directory")

    # Check new file path length
    new_path = user_path.parent / new_name
    if not check_path_length(new_path):
        raise HTTPException(status_code=status.HTTP_414_URI_TOO_LONG, detail="File path too long")

    # Check for any attempts at path traversal again
    _, valid = check_path_subdir(new_path, base_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    # Check if file already exists
    if new_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    # Rename the file
    user_path.rename(new_path)
    background_tasks.add_task(add_folder_change, credentials, str(user_path.relative_to(base_path).parent))

    return "Item renamed"
