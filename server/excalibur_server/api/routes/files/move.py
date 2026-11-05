from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from pydantic import Base64Bytes, BaseModel, field_validator
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_ancestors, get_session, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import NAME_TAG_SIZE
from excalibur_server.src.users import get_user_from_id


class MoveDestination(BaseModel):
    dest_id: str
    "The ID of the directory to move the item into (`.` to specify the root directory)"
    name_tag: Base64Bytes
    "The item's new name tag, which is bound to its new parent"

    @field_validator("name_tag")
    @classmethod
    def validate_name_tag(cls, value: bytes) -> bytes:
        if len(value) != NAME_TAG_SIZE:
            raise ValueError(f"must be exactly {NAME_TAG_SIZE} bytes")
        return value


@encrypted_router.post(
    "/move/{item_id}",
    name="Move Item",
    responses={
        status.HTTP_200_OK: {"description": "Item moved", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Item/destination not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists at destination"},
        status.HTTP_412_PRECONDITION_FAILED: {
            "description": "Cannot move root directory, or move a directory into itself or one of its subdirectories"
        },
    },
    response_class=PlainTextResponse,
)
async def move_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The ID of the item to move")],
    destination: Annotated[MoveDestination, Body(description="The destination of the item")],
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Moves a file or directory.

    Cannot move root directory (`.`), nor move a directory into itself or one of its subdirectories.

    The name tag is bound to the item's parent, so the client has to provide the item's new tag.
    The item's encrypted name does not change.
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
    dest_folder = get_user_item(destination.dest_id, root_id)
    if not dest_folder or not dest_folder.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")

    # Raise conflict if the new location is the same as the current location
    if item.parent_id == dest_folder.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    # Prohibit moving a directory into itself or its own subtree
    # (Note: the destination's ancestors include the destination itself)
    if item.is_folder and any(ancestor.id == item.id for ancestor in get_item_ancestors(dest_folder.id)):
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Cannot move a directory into itself or one of its subdirectories",
        )

    # Dirty the original path's parents
    mark_dirty(item.id)

    # Move the item
    with get_session() as session:
        try:
            with session.begin():
                db_item = session.query(FSItem).filter_by(id=item.id).first()
                db_item.parent_id = dest_folder.id
                db_item.name_tag = destination.name_tag
                session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists at destination")

    # Dirty the destination path's parents
    mark_dirty(item.id)

    # Notify folder changes
    background_tasks.add_task(add_folder_change, credentials, item.parent_id)  # Source
    background_tasks.add_task(add_folder_change, credentials, dest_folder.id)  # Destination
