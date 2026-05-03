from typing import Annotated

from fastapi import Depends, status

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_items_in_root
from excalibur_server.src.files.structures import Directory, File
from excalibur_server.src.users import get_user


@encrypted_router.get(
    "/all",
    name="Get All Items",
    responses={
        status.HTTP_200_OK: {
            "content": {
                "application/json": {
                    "example": [
                        {
                            "name": "example.txt",
                            "creation_time": 1100000000,
                            "fullpath": "example.txt",
                            "type": "file",
                            "size": 1024,
                        },
                        {
                            "name": "folder-1",
                            "creation_time": 1200000000,
                            "fullpath": "folder-1",
                            "type": "directory",
                            "items": None,
                        },
                    ],
                }
            },
        },
    },
)
def get_all_items_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]) -> list[File | Directory]:
    """
    Lists all the items owned by the authenticated user.

    Any directories will *not* have their items returned.
    """

    username = credentials.username

    # Get all filesystem items owned by the user
    root_id = get_user(username).fsitem_id
    fsitems = get_items_in_root(root_id)

    # Convert to appropriate filelike instances
    items = []
    for fsitem in fsitems:
        if fsitem.is_folder:
            item = Directory.from_fsitem(fsitem)
        else:
            item = File.from_fsitem(fsitem)
        items.append(item)

    return items
