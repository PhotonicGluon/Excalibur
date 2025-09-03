from pathlib import Path as PathlibPath
from typing import Annotated

from fastapi import Depends, HTTPException, Path, Query, status
from fastapi.responses import FileResponse

from excalibur_server.api.routes.files import router
from excalibur_server.src.auth.token import get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.files.listings import listdir
from excalibur_server.src.files.structures import Directory
from excalibur_server.src.path import check_path_subdir


@router.get(
    "/download/{path:path}",
    name="Download File",
    responses={
        status.HTTP_200_OK: {
            "content": {"application/octet-stream": {"example": "Some file content. Can be binary."}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a file"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
    response_class=FileResponse,
)
async def download_file_endpoint(
    username: Annotated[str, Depends(get_credentials)],
    path: Annotated[str, Path(description="The file to download")],
):
    """
    Downloads a file.

    MIME type of the downloaded file should be inferred by the client.
    """

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(PathlibPath(username) / path, CONFIG.server.vault_folder)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_file()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a file")

    return FileResponse(user_path, media_type="application/octet-stream")


@router.get(
    "/list/{path:path}",
    name="List Directory Contents",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
    response_model=Directory,
)
def listdir_endpoint(
    username: Annotated[str, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path to list (use `.` to specify root directory)")],
    with_exef_header: Annotated[
        bool, Query(description="Whether to include ExEF header size in the file sizes")
    ] = False,
):
    """
    Lists the contents of a directory.

    Any subdirectories in the main directory will *not* have their items listed (i.e. items will be sent as `null`).
    """

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(PathlibPath(username) / path, CONFIG.server.vault_folder)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    contents = listdir(username, user_path, include_exef_size=with_exef_header)
    if contents is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    return contents
