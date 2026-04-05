from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.responses import FileResponse as FastAPIFileResponse

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_item_by_path
from excalibur_server.src.path import check_path_subdir
from excalibur_server.src.users import get_user


class FileResponse(FastAPIFileResponse):
    # For some reason, the file response chunk size is configured as a class variable.
    # So, if we want to change it, we need to update the class variable directly, which is a bit weird but works
    chunk_size = CONFIG.storage.send_chunk_size


def _old_download(path: str, username: str):
    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, CONFIG.storage.vault_folder / username)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_file()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a file")

    return FileResponse(user_path, media_type="application/octet-stream")


@encrypted_router.get(
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
def download_file_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The file to download")],
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Downloads a file.

    MIME type of the downloaded file should be inferred by the client.
    """

    path = processed_path
    username = credentials.username

    # Handle legacy users without flattened filesystem
    root_id = get_user(username).fsitem_id
    if root_id is None:
        return _old_download(path, username)

    # Get item to be downloaded
    item = get_item_by_path(root_id, path)
    if not item or item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a file")

    return FileResponse(
        CONFIG.storage.vault_folder / username / (str(item.id) + ".exef"),
        media_type="application/octet-stream",
        filename=item.name,
    )
