from typing import Annotated

from fastapi import Depends

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_items_with_root
from excalibur_server.src.files.structures import Directory, File
from excalibur_server.src.users import get_user_from_id


@encrypted_router.get("/all", name="Get All Items")
def get_all_items_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]) -> list[File | Directory]:
    """
    Lists all the items owned by the authenticated user.

    Any directories will *not* have their items returned.
    """

    user_id = credentials.user_id

    # Get all filesystem items owned by the user
    root_id = get_user_from_id(user_id).fsitem_id
    fsitems = get_items_with_root(root_id)

    # Convert to appropriate filelike instances
    items = []
    for fsitem in fsitems:
        if fsitem.is_folder:
            item = Directory.from_fsitem(fsitem)
        else:
            item = File.from_fsitem(fsitem)
        items.append(item)

    return items
