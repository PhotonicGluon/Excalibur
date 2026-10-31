from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_fullpath, get_session, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.users import get_user_from_id


@encrypted_router.post(
    "/move/{item_id}",
    name="Move Item",
    responses={
        status.HTTP_200_OK: {"description": "Item moved", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Item/destination not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists at destination"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot move root directory"},
    },
    response_class=PlainTextResponse,
)
async def move_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The ID of the item to move")],
    new_location: Annotated[
        str, Body(description="The ID of the directory to move the item into (use `.` to specify root directory)")
    ],
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Moves a file or directory.

    Cannot move root directory (`.`).
    """

    item_id = processed_item_id
    user_id = credentials.user_id

    # Get the item to move
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(item_id, root_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Prohibit moving the root directory
    if item.id == root_id:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot move root directory")

    # Get the destination folder
    dest_folder = get_user_item(new_location, root_id)
    if not dest_folder or not dest_folder.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")

    # Raise conflict if the new location is the same as the current location
    if item.parent_id == dest_folder.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    src_folder_path = get_item_fullpath(item.parent_id)

    # Dirty the original path's parents
    mark_dirty(item.id)

    # Move the item
    with get_session() as session:
        try:
            with session.begin():
                db_item = session.query(FSItem).filter_by(id=item.id).first()
                db_item.parent_id = dest_folder.id
                session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    # Dirty the destination path's parents
    mark_dirty(item.id)

    # Notify folder changes
    background_tasks.add_task(add_folder_change, credentials, src_folder_path)  # Source
    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(item.id).parent)  # Destination
