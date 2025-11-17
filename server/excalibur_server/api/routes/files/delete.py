import shutil
from typing import Annotated

from fastapi import BackgroundTasks, Depends, HTTPException, Path, Query, status
from fastapi.responses import Response

from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_subdir


@encrypted_router.delete(
    "/delete/{path:path}",
    name="Delete Path",
    responses={
        status.HTTP_200_OK: {"description": "Deleted file", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Deleted directory"},
        status.HTTP_400_BAD_REQUEST: {"description": "Cannot delete directory if `as_dir` is not set"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot delete root directory"},
        status.HTTP_417_EXPECTATION_FAILED: {
            "description": "Cannot delete directory if it is not empty (and `force` is not set)"
        },
    },
)
def delete_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to delete")],
    as_dir: Annotated[bool, Query(description="Delete directory instead of file")] = False,
    force: Annotated[bool, Query(description="Force delete (delete even if directory is not empty)")] = False,
    response: Response = ...,
):
    """
    Deletes a file or directory.

    If deleting a directory, you need to specify the `as_dir` parameter. All files and
    subdirectories will be deleted as well.
    """

    username = credentials.username
    base_path = CONFIG.storage.vault_folder / username

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, base_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    # Check if user is trying to delete root directory
    if user_path == base_path:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot delete root directory")

    background_tasks.add_task(add_folder_change, username, str(user_path.relative_to(base_path).parent))

    # Handle deletion
    if user_path.is_dir():
        if not as_dir:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete directory if `as_dir` is not set"
            )
        if not force and any(user_path.iterdir()):
            raise HTTPException(status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Directory is not empty")

        shutil.rmtree(user_path)
        response.status_code = status.HTTP_202_ACCEPTED
        return

    user_path.unlink()
    response.status_code = status.HTTP_200_OK
