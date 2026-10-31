from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import add_item, get_item_fullpath, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.users import get_user_from_id


@encrypted_router.post(
    "/mkdir/{parent_id}",
    name="Create Directory",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Directory created",
            "content": {"text/plain": {"example": "01234567-89ab-dcef-0123-456789abcdef"}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid directory name"},
        status.HTTP_404_NOT_FOUND: {"description": "Parent not found or is not a directory"},
        status.HTTP_409_CONFLICT: {"description": "Directory already exists"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
)
async def create_directory_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    parent_id: Annotated[
        str, Path(description="The ID of the folder to create the new directory in (use `.` to specify root directory)")
    ],
    name: Annotated[str, Body(description="The name of the new directory")],
    processed_parent_id: str = Depends(process_path_param("parent_id")),
):
    """
    Creates a new directory, returning the ID of the new directory if successful.
    """

    parent_id = processed_parent_id
    user_id = credentials.user_id

    # Get parent folder
    root_id = get_user_from_id(user_id).fsitem_id
    parent = get_user_item(parent_id, root_id)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found or is not a directory")

    # Check directory name
    if "/" in name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid directory name")

    # Create the directory in the database
    new_folder = FSItem(name=name, parent_id=parent.id, root_id=parent.root_id, is_folder=True)
    new_folder_id = new_folder.id
    try:
        add_item(new_folder)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists")

    mark_dirty(new_folder_id)
    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(parent.id))

    return str(new_folder_id)
