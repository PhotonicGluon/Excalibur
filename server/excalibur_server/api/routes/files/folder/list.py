from typing import Annotated

from fastapi import Depends, HTTPException, Path, Query, status

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.files.structures import Directory
from excalibur_server.src.files.utils import listdir
from excalibur_server.src.path import check_path_subdir


@encrypted_router.get(
    "/list/{path:path}",
    name="List Directory Contents",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
    response_model=Directory,
)
def listdir_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to list (use `.` to specify root directory)")],
    include_exef_size: Annotated[
        bool, Query(description="Whether to include the additional ExEF size (i.e., header and footer) in file sizes")
    ] = False,
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Lists the contents of a directory.

    Any subdirectories in the main directory will *not* have their items listed (i.e. items will be sent as `null`).
    """

    path = processed_path
    username = credentials.username

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, CONFIG.storage.vault_folder / username)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    contents = listdir(username, user_path, include_exef_size=include_exef_size)
    if contents is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    return contents
