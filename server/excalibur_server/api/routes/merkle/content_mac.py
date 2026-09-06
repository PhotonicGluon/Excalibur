from base64 import b64encode
from typing import Annotated
from uuid import UUID

from fastapi import Body, Depends

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.merkle.mac import get_content_mac_input
from excalibur_server.src.db.operations import get_item, get_user_from_id


@encrypted_router.post("/content-mac-inputs", name="Get Content MAC Inputs")
def content_mac_inputs_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    ids: Annotated[list[UUID], Body(description="List of item IDs to get content MAC inputs for")],
):
    """
    Gets the inputs for the content MAC for the given items.

    The item's content MAC inputs will be `null` if either:
    - the item does not exist;
    - the item does not belong to the user; or
    - the item is a folder

    Otherwise the content MAC input is represented as a Base64-encoded string.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id

    content_mac_inputs = {}
    for id in ids:
        item = get_item(id)
        if item is None or item.root_id != root_id or item.is_folder:
            content_mac_inputs[id] = None
            continue

        path = CONFIG.storage.vault_folder / item.system_path
        if not path.is_file():
            content_mac_inputs[id] = None
            continue

        with open(path, "rb") as f:
            content_mac_inputs[id] = b64encode(get_content_mac_input(f)).decode("utf-8")

    return content_mac_inputs
