import time
from pathlib import Path as PathlibPath
from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_by_path, get_item_fullpath, get_session
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.users import get_user


@encrypted_router.post(
    "/move/{path:path}",
    name="Move Item",
    responses={
        status.HTTP_200_OK: {"description": "Item moved", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Item/destination not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists at destination"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot move root directory"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Path too long"},
    },
    response_class=PlainTextResponse,
)
async def move_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The item to move")],
    new_location: Annotated[str, Body(description="The directory containing the item")],
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Moves a file or directory.

    Cannot move root directory (`.`).
    """

    path = processed_path
    username = credentials.username

    # Get the item to move
    root_id = get_user(username).fsitem_id
    item = get_item_by_path(root_id, path)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Prohibit moving the root directory
    if item.id == root_id:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot move root directory")

    # Get the destination folder
    dest_folder = get_item_by_path(root_id, new_location)
    if not dest_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")

    # For consistency with the old approach, if the new location is the same as the current location, we raise
    # a conflict
    if item.parent_id == dest_folder.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    # Move the item
    with get_session() as session:
        try:
            with session.begin():
                db_item = session.query(FSItem).filter_by(id=item.id).first()
                db_item.parent_id = dest_folder.id
                db_item.fullpath = str(PathlibPath(dest_folder.fullpath) / db_item.name)
                db_item.last_modified = int(time.time())
                session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(item.id).parent)
