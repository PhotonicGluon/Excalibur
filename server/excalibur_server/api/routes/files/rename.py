from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_by_path, get_item_fullpath, get_session, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.users import get_user_from_id


@encrypted_router.post(
    "/rename/{path:path}",
    name="Rename Item",
    responses={
        status.HTTP_200_OK: {"description": "Item renamed", "content": None},
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid name"},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
        status.HTTP_417_EXPECTATION_FAILED: {"description": "Renamed file needs to end with `.exef`"},
    },
    response_class=PlainTextResponse,
)
async def rename_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The item to rename")],
    new_name: Annotated[str, Body(description="The new name for the item at the leaf of the path")],
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Renames a file or directory.

    Cannot rename root directory (`.`).
    """

    path = processed_path
    user_id = credentials.user_id

    # Get the item to rename
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_item_by_path(root_id, path)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Check new item name
    if "/" in new_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid name")

    # Prohibit renaming the root directory
    if item.id == root_id:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot rename root directory")

    # Check if the new name ends with .exef if it's a file
    if not item.is_folder and not new_name.endswith(".exef"):
        raise HTTPException(
            status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Renamed file needs to end with `.exef`"
        )

    # Rename the item
    with get_session() as session:
        try:
            with session.begin():
                db_item = session.get(FSItem, item.id)
                db_item.name = new_name
                session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    mark_dirty(item.id)
    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(item.id).parent)
