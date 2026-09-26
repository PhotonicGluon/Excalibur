from collections import deque
from pathlib import PurePosixPath
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Path, status

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item, get_item_fullpath, get_items_in_folder, get_user_from_id
from excalibur_server.src.files.structures import Directory, File


@encrypted_router.get(
    "/subtree/{item_id}",
    name="Get Subtree",
    responses={
        status.HTTP_200_OK: {
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "00000000-0000-0000-0000-000000000000",
                            "name": "example.txt",
                            "creation_time": 1100000000,
                            "fullpath": "folder-1/example.txt",
                            "type": "file",
                            "size": 1024,
                        },
                        {
                            "id": "00000000-0000-0000-0000-000000000001",
                            "name": "folder-2",
                            "creation_time": 1200000000,
                            "fullpath": "folder-1/folder-2",
                            "type": "directory",
                        },
                    ],
                }
            },
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Item is not a folder"},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
    },
)
def subtree_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[UUID, Path(description="The ID of the folder to get the subtree of")],
    processed_item_id: str = Depends(process_path_param("item_id")),
) -> list[File | Directory]:
    """
    Lists every descendant of a folder (i.e., its children, their children, and so on).

    The folder itself is *not* included. The `fullpath` of each item is relative to the user's root
    folder. Any directories will *not* have their items returned.
    """

    item_id: UUID = UUID(processed_item_id)
    user_id = credentials.user_id

    # Get folder and verify it belongs to the user
    root_id = get_user_from_id(user_id).fsitem_id
    folder = get_item(item_id)
    if folder is None or folder.root_id != root_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    if not folder.is_folder:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item is not a folder")

    # Walk the subtree breadth-first, tracking each folder's path so that we don't need to recompute it
    items: list[File | Directory] = []
    seen_ids = {folder.id}
    queue: deque[tuple[UUID, PurePosixPath]] = deque([(folder.id, get_item_fullpath(folder.id))])
    while queue:
        parent_id, parent_path = queue.popleft()
        for child in get_items_in_folder(parent_id):
            if child.id in seen_ids:  # Guards against circular references
                continue
            seen_ids.add(child.id)

            if child.is_folder:
                items.append(Directory.from_fsitem(child, parent_path))
                queue.append((child.id, parent_path / child.name))
            else:
                items.append(File.from_fsitem(child, parent_path))

    return items
