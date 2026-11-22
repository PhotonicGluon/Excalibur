import tempfile
from collections.abc import Generator
from typing import Annotated

import aiofiles
from fastapi import BackgroundTasks, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import get_user_item, parse_item_details, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import add_item, get_item, get_item_by_name_tag, mark_dirty
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
    "/upload/{parent_id}/{item_details}",
    name="Upload File",
    responses={
        status.HTTP_201_CREATED: {
            "description": "File uploaded",
            "content": {"text/plain": {"example": "01234567-89ab-dcef-0123-456789abcdef"}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Malformed item details"},
        status.HTTP_404_NOT_FOUND: {"description": "Parent not found or is not a directory"},
        status.HTTP_409_CONFLICT: {
            "description": "File ID already exists, or file name already exists (and `force` parameter is not set)"
        },
        status.HTTP_413_CONTENT_TOO_LARGE: {"description": "File too large"},  # Returned in LimitUploadSizeMiddleware
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
    item_details: Annotated[
        str,
        Path(
            description=(
                "The ID and encrypted name of the new file, as `id:name_enc:name_tag`. The ID is the canonical "
                "UUID string, and the other two parts are URL-safe Base64"
            )
        ),
    ],
    force: Annotated[bool, Query(description="Force upload (overwrite existing files)")] = False,
    file: tempfile.SpooledTemporaryFile = Depends(_get_spooled_file),
    processed_parent_id: str = Depends(process_path_param("parent_id")),
    processed_item_details: str = Depends(process_path_param("item_details")),
):
    """
    Uploads a file to a directory, returning the ID of the new file if successful.

    The ID is chosen by the client, since the encrypted name needs to contain it. It is rejected if
    it already exists.
    """

    parent_id = processed_parent_id
    item_details = processed_item_details
    new_item = parse_item_details(item_details)

    user_id = credentials.user_id

    # Get parent ID
    root_id = get_user_from_id(user_id).fsitem_id
    parent = get_user_item(parent_id, root_id)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found or is not a directory")

    # Check that the ID is free
    if get_item(new_item.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="File ID already exists")

    # Check if file already exists
    existing_file = get_item_by_name_tag(parent.id, new_item.name_tag)
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
        id=new_item.id,
        parent_id=parent.id,
        root_id=parent.root_id,
        name_enc=new_item.name_enc,
        name_tag=new_item.name_tag,
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
    background_tasks.add_task(add_folder_change, credentials, parent.id)

    return str(new_file_id)
