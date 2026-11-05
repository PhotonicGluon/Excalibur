from typing import Annotated
from uuid import UUID

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item, get_session, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import EncryptedName
from excalibur_server.src.users import get_user_from_id


@encrypted_router.post(
    "/rename/{item_id}",
    name="Rename Item",
    responses={
        status.HTTP_200_OK: {"description": "Item renamed", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
    },
    response_class=PlainTextResponse,
)
async def rename_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The ID of the item to rename")],
    new_name: Annotated[EncryptedName, Body(description="The new encrypted name for the item")],
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Renames a file or a non-root directory.
    """

    item_id = processed_item_id
    user_id = credentials.user_id

    # Get the item to rename
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(item_id, root_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Prohibit renaming the root directory
    if item.id == root_id:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot rename root directory")

    # Rename the item
    with get_session() as session:
        try:
            with session.begin():
                db_item = session.get(FSItem, item.id)
                db_item.name = None  # Drop any legacy plaintext name
                db_item.name_enc = new_name.name_enc
                db_item.name_tag = new_name.name_tag
                session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    mark_dirty(item.id)
    background_tasks.add_task(add_folder_change, credentials, item.parent_id)


@encrypted_router.post(
    "/rename-multiple",
    name="Rename Multiple Items",
    responses={
        status.HTTP_200_OK: {"description": "Items renamed", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
    },
    response_class=PlainTextResponse,
)
async def rename_multiple_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    renames: Annotated[
        dict[UUID, EncryptedName],
        Body(
            description="Mapping of item IDs to their new encrypted names",
            examples=[
                {
                    "node-uuid-1": {"name_enc": "bmV3LW5hbWUtMQ==", "name_tag": "<Base64 of 32 bytes>"},
                    "node-uuid-2": {"name_enc": "bmV3LW5hbWUtMg==", "name_tag": "<Base64 of 32 bytes>"},
                }
            ],
        ),
    ],
):
    """
    Renames multiple files and non-root directories at once.

    Note that if one rename fails, none of the items are renamed.

    Each rename is checked in the same way as in the single item rename endpoint. Note that the
    renames are applied together, so two items cannot be given the same name within the same
    folder, and swapping the names of two items is not supported.
    """

    user_id = credentials.user_id
    root_id = get_user_from_id(user_id).fsitem_id

    # Validate every rename before changing anything
    for item_id in renames:
        item = get_user_item(str(item_id), root_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{item_id}' not found")

        # Prohibit renaming the root directory
        if item.id == root_id:
            raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot rename root directory")

    # Rename the items in a single transaction, so that a conflict undoes every rename
    with get_session() as session:
        try:
            with session.begin():
                for item_id, new_name in renames.items():
                    db_item = session.get(FSItem, item_id)
                    db_item.name = None  # Drop any legacy plaintext name
                    db_item.name_enc = new_name.name_enc
                    db_item.name_tag = new_name.name_tag
                    session.add(db_item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists")

    # Mark the chain of each item as dirty
    for item_id in renames:
        mark_dirty(item_id)

    # Notify about each affected folder once
    parent_ids = {get_item(item_id).parent_id for item_id in renames}
    for parent_id in parent_ids:
        background_tasks.add_task(add_folder_change, credentials, parent_id)
