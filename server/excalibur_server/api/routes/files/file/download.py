from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.responses import FileResponse as FastAPIFileResponse

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_item_by_path
from excalibur_server.src.users import get_user


class FileResponse(FastAPIFileResponse):
    # For some reason, the file response chunk size is configured as a class variable.
    # So, if we want to change it, we need to update the class variable directly, which is a bit weird but works
    chunk_size = CONFIG.storage.send_chunk_size


@encrypted_router.get(
    "/download/{path:path}",
    name="Download File",
    responses={
        status.HTTP_200_OK: {
            "content": {"application/octet-stream": {"example": "Some file content. Can be binary."}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a file"},
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

    # Get item to be downloaded
    root_id = get_user(username).fsitem_id
    item = get_item_by_path(root_id, path)
    if not item or item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a file")

    return FileResponse(
        CONFIG.storage.vault_folder / username / item.system_path,
        media_type="application/octet-stream",
        filename=item.name,
    )
