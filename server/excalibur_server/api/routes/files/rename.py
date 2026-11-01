from typing import Annotated
from uuid import UUID

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
    "/rename/{item_id}",
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
    item_id: Annotated[str, Path(description="The ID of the item to rename")],
    new_name: Annotated[str, Body(description="The new name for the item")],
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Renames a file or directory.

    Cannot rename root directory (`.`).
    """

    item_id = processed_item_id
    user_id = credentials.user_id

    # Get the item to rename
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(item_id, root_id)
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


@encrypted_router.post(
    "/rename-multiple",
    name="Rename Multiple Items",
    responses={
        status.HTTP_200_OK: {"description": "Items renamed", "content": None},
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid name"},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
        status.HTTP_417_EXPECTATION_FAILED: {"description": "Renamed file needs to end with `.exef`"},
    },
    response_class=PlainTextResponse,
)
async def rename_multiple_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    renames: Annotated[
        dict[UUID, str],
        Body(
            description="Mapping of item IDs to their new names",
            examples=[{"node-uuid-1": "new-name-1.exef", "node-uuid-2": "new-folder-name"}],
        ),
    ],
):
    """
    Renames multiple files and directories at once.

    Note that if one rename fails, none of the items are renamed.

    Each rename is checked in the same way as in the single item rename endpoint. Note that the
    renames are applied together, so two items cannot be given the same name within the same
    folder, and swapping the names of two items is not supported.

    Cannot rename root directory.
    """

    user_id = credentials.user_id
    root_id = get_user_from_id(user_id).fsitem_id

    # Validate every rename before changing anything
    for item_id, new_name in renames.items():
        item = get_user_item(str(item_id), root_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{item_id}' not found")

        # Check new item name
        if "/" in new_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Illegal or invalid name for item '{item_id}'"
            )

        # Prohibit renaming the root directory
        if item.id == root_id:
            raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot rename root directory")

        # Check if the new name ends with .exef if it's a file
        if not item.is_folder and not new_name.endswith(".exef"):
            raise HTTPException(
                status_code=status.HTTP_417_EXPECTATION_FAILED,
                detail=f"Renamed file '{item_id}' needs to end with `.exef`",
            )

    # Rename the items in a single transaction, so that a conflict undoes every rename
    with get_session() as session:
        try:
            with session.begin():
                for item_id, new_name in renames.items():
                    db_item = session.get(FSItem, item_id)
                    db_item.name = new_name
                    session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    # Mark the chain of each item as dirty
    for item_id in renames:
        mark_dirty(item_id)

    # Notify about each affected folder once
    parent_paths = {get_item_fullpath(item_id).parent for item_id in renames}
    for parent_path in parent_paths:
        background_tasks.add_task(add_folder_change, credentials, parent_path)
