import shutil
from pathlib import Path as PathlibPath
from typing import Annotated

from fastapi import Depends, HTTPException, Path, Query, status
from fastapi.responses import Response

from excalibur_server.api.routes.files import router
from excalibur_server.src.config import CONFIG
from excalibur_server.src.path import check_path_subdir
from excalibur_server.src.auth.token import get_credentials


@router.delete(
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
    username: Annotated[str, Depends(get_credentials)],
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

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(PathlibPath(username) / path, CONFIG.server.vault_folder)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not user_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found")

    # Check if user is trying to delete root directory
    if user_path == CONFIG.server.vault_folder / PathlibPath(username):
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot delete root directory")

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
