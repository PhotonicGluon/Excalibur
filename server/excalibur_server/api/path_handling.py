from base64 import b64decode
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from pydantic import ValidationError

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import NewItem


def handle_path_param(param_value: str, credentials: Credentials) -> str:
    """
    Handles a possibly encrypted path parameter.

    :param param_value: value of the path parameter
    :param credentials: credentials of the user
    :returns: decrypted path parameter
    """

    if not credentials.encrypted:
        return param_value

    e2ee_key = MASTER_KEYS_CACHE.get(credentials.comm_uuid)
    raw_bytes = b64decode(param_value, altchars="-_")  # URL-safe Base64 character set
    return ExEF(e2ee_key).decrypt(raw_bytes).decode("utf-8")


def process_path_param(param_name: str):
    """
    A dependency that processes a possibly encrypted path parameter.

    :param param_name: name of the path parameter
    :returns: processed path parameter
    """

    def wrapper(
        request: Request,
        credentials: Annotated[Credentials, Depends(get_credentials)],
    ):
        raw_value = request.path_params[param_name]
        return handle_path_param(raw_value, credentials)

    return wrapper


def get_user_item(param_value: str, root_id: UUID) -> FSItem | None:
    """
    Gets the item referred to by an (already processed) item ID parameter.

    :param param_value: the item ID, or `.` to specify the root directory
    :param root_id: the ID of the user's root directory
    :returns: the item, or None if it does not exist, is not a valid ID, or does not belong to the user
    """

    if param_value == ".":
        return get_item(root_id)

    try:
        item = get_item(UUID(param_value))
    except ValueError:
        return None

    if item is None or item.root_id != root_id:
        return None
    return item


def parse_item_details(item_details: str) -> NewItem:
    """
    Parses the (preprocessed) `item_details` path parameter of a new item.

    The parameter has the form `id:name_enc:name_tag`, where
    - `id` is the canonical UUID string;
    - `name_enc` is the encrypted name data in URL-safe Base64; and
    - `name_tag` is the authentication tag for the encrypted name in URL-safe Base64.

    :param item_details: the processed `item_details` parameter
    :returns: the parsed item details
    :raises HTTPException: with status 400 if the parameter is malformed
    """

    error = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed item details")

    parts = item_details.split(":")
    if len(parts) != 3:
        raise error

    # `NewItem` expects standard Base64, so translate from the URL-safe character set
    to_standard = str.maketrans("-_", "+/")
    try:
        return NewItem(
            id=UUID(parts[0]),
            name_enc=parts[1].translate(to_standard),
            name_tag=parts[2].translate(to_standard),
        )
    except (ValueError, ValidationError):
        raise error from None
