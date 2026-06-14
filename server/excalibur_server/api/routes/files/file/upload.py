import os
import tempfile
from pathlib import Path as PathlibPath
from typing import Annotated, Generator

import aiofiles
from fastapi import BackgroundTasks, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import add_item, get_item_by_path
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.utils import rmitem
from excalibur_server.src.users import get_user_from_id


async def _get_spooled_file(request: Request) -> Generator[tempfile.SpooledTemporaryFile, None, None]:
    """
    A dependency that creates a spooled temporary file from the request body.

    :param request: the request object
    :yield: the spooled temporary file
    """

    spooled_file = tempfile.SpooledTemporaryFile(max_size=CONFIG.storage.max_spool_size)
    try:
        async for chunk in request.stream():
            spooled_file.write(chunk)
        spooled_file.seek(0)
        yield spooled_file
    finally:
        spooled_file.close()


@encrypted_router.post(
    "/upload/{path:path}",
    name="Upload File",
    responses={
        status.HTTP_201_CREATED: {"description": "File uploaded", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_409_CONFLICT: {"description": "File already exists (and `force` parameter is not set)"},
        status.HTTP_413_CONTENT_TOO_LARGE: {"description": "File too large"},  # Returned in LimitUploadSizeMiddleware
        status.HTTP_417_EXPECTATION_FAILED: {"description": "Uploaded file needs to end with `.exef`"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
    openapi_extra={
        "requestBody": {
            "content": {
                "application/octet-stream": {
                    "schema": {"type": "string", "format": "binary"},
                }
            },
            "required": True,
            "description": "Upload a binary file.",
        }
    },
)
async def upload_file_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The path where the file will be placed (must end with `.exef`)")],
    force: Annotated[bool, Query(description="Force upload (overwrite existing files)")] = False,
    file: tempfile.SpooledTemporaryFile = Depends(_get_spooled_file),
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Uploads a file to a directory.
    """

    path = PathlibPath(processed_path).relative_to(".")
    user_id = credentials.user_id

    # Split path into directory and file name
    dir_path, name = os.path.split(path)

    # Check file extension
    if not name.endswith(".exef"):
        raise HTTPException(
            status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Uploaded file needs to end with `.exef`"
        )

    # Get parent ID
    root_id = get_user_from_id(user_id).fsitem_id
    parent = get_item_by_path(root_id, dir_path)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check if file already exists
    existing_file = get_item_by_path(root_id, str(path))
    if existing_file:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="File already exists. Use `force` parameter to overwrite."
            )

        rmitem(existing_file)

    # Prepare a new `FSItem` instance
    new_file = FSItem(
        parent_id=parent.id,
        root_id=parent.root_id,
        name=name,
        is_folder=False,
        size=0,  # Will be updated later
    )

    # Create file paths
    new_file_path = CONFIG.storage.vault_folder / new_file.system_path
    new_file_path.parent.mkdir(parents=True, exist_ok=True)

    # Save the file
    size = 0
    async with aiofiles.open(new_file_path, "wb") as out_file:
        while content := file.read(CONFIG.storage.write_chunk_size):
            size += await out_file.write(content)

    # Create the file in the database
    new_file.size = size
    add_item(new_file)
    background_tasks.add_task(add_folder_change, credentials, dir_path)
