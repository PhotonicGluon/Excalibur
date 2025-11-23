from typing import Annotated

from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_length, check_path_subdir
from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse


@encrypted_router.post(
    "/mkdir/{path:path}",
    name="Create Directory",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Directory created",
            "content": {"text/plain": {"example": "Directory created", "schema": None}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid directory name"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Directory already exists"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Directory path too long"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
)
async def create_directory_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[
        str, Path(description="The path to create the new directory at (use `.` to specify root directory)")
    ],
    name: Annotated[str, Body(description="The name of the new directory")],
):
    """
    Creates a new directory.
    """

    username = credentials.username
    base_path = CONFIG.storage.vault_folder / username

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, base_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_dir()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check for any attempts at path traversal, again
    dir_path, valid = check_path_subdir(name, user_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    # Check directory path length
    dir_path = user_path / name
    if not check_path_length(dir_path):
        raise HTTPException(status_code=status.HTTP_414_URI_TOO_LONG, detail="Directory path too long")

    # Check if directory already exists
    if dir_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists")

    # Create the directory
    dir_path.mkdir(parents=True)

    background_tasks.add_task(add_folder_change, credentials, path)
    return "Directory created"
