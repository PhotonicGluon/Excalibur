import tempfile
from collections.abc import Generator
from typing import Annotated

import aiofiles
from fastapi import BackgroundTasks, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import add_item, get_item_fullpath, get_items_in_folder, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.utils import rmitem
from excalibur_server.src.users import get_user_from_id


async def _get_spooled_file(request: Request) -> Generator[tempfile.SpooledTemporaryFile, None, None]:
    """
    A dependency that creates a spooled temporary file from the request body.

    :param request: the request object
    :yield: the spooled temporary file
    """

    spooled_file = tempfile.SpooledTemporaryFile(max_size=CONFIG.storage.max_spool_size)  # noqa: SIM115
    try:
        async for chunk in request.stream():
            spooled_file.write(chunk)
        spooled_file.seek(0)
        yield spooled_file
    finally:
        spooled_file.close()


@encrypted_router.post(
    "/upload/{parent_id}/{filename}",
    name="Upload File",
    responses={
        status.HTTP_201_CREATED: {
            "description": "File uploaded",
            "content": {"text/plain": {"example": "01234567-89ab-dcef-0123-456789abcdef"}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid file name"},
        status.HTTP_404_NOT_FOUND: {"description": "Parent not found or is not a directory"},
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
    parent_id: Annotated[
        str, Path(description="The ID of the folder to place the file in (use `.` to specify root directory)")
    ],
    filename: Annotated[str, Path(description="The name of the new file (must end with `.exef`)")],
    force: Annotated[bool, Query(description="Force upload (overwrite existing files)")] = False,
    file: tempfile.SpooledTemporaryFile = Depends(_get_spooled_file),
    processed_parent_id: str = Depends(process_path_param("parent_id")),
    processed_filename: str = Depends(process_path_param("filename")),
):
    """
    Uploads a file to a directory, returning the ID of the new file if successful.
    """

    parent_id = processed_parent_id
    filename = processed_filename

    user_id = credentials.user_id

    # Check file name and extension
    if "/" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid file name")

    if not filename.endswith(".exef"):
        raise HTTPException(
            status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Uploaded file needs to end with `.exef`"
        )

    # Get parent ID
    root_id = get_user_from_id(user_id).fsitem_id
    parent = get_user_item(parent_id, root_id)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found or is not a directory")

    # Check if file already exists
    existing_file = next((item for item in get_items_in_folder(parent.id) if item.name == filename), None)
    if existing_file:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="File already exists. Use `force` parameter to overwrite."
            )

        # Mark the tree dirty before deleting the existing file (so that if the delete fails, the tree is still marked
        # dirty)
        mark_dirty(existing_file.id)
        rmitem(existing_file)

    # Prepare a new `FSItem` instance
    new_file = FSItem(
        parent_id=parent.id,
        root_id=parent.root_id,
        name=filename,
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
    new_file_id = new_file.id
    new_file.size = size
    add_item(new_file)
    mark_dirty(new_file_id)
    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(parent.id))

    return str(new_file_id)
