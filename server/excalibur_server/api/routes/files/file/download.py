from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.responses import FileResponse as FastAPIFileResponse

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.users import get_user_from_id


class FileResponse(FastAPIFileResponse):
    # For some reason, the file response chunk size is configured as a class variable.
    # So, if we want to change it, we need to update the class variable directly, which is a bit weird but works
    chunk_size = CONFIG.storage.send_chunk_size


@encrypted_router.get(
    "/download/{file_id}",
    name="Download File",
    responses={
        status.HTTP_200_OK: {
            "content": {"application/octet-stream": {"example": "Some file content. Can be binary."}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Item not found or is not a file"},
    },
    response_class=FileResponse,
)
def download_file_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    file_id: Annotated[str, Path(description="The ID of the file to download")],
    processed_file_id: str = Depends(process_path_param("file_id")),
):
    """
    Downloads a file.

    MIME type of the downloaded file should be inferred by the client.
    """

    file_id = processed_file_id
    user_id = credentials.user_id

    # Get item to be downloaded
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(file_id, root_id)
    if not item or item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found or is not a file")

    return FileResponse(
        CONFIG.storage.vault_folder / item.system_path,
        media_type="application/octet-stream",
        filename=item.name,
    )
