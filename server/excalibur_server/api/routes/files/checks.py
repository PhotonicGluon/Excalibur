from typing import Annotated

from fastapi import Body, Depends, HTTPException, Path, Response, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_items_in_folder, is_dir_empty
from excalibur_server.src.users import get_user_from_id


@encrypted_router.head(
    "/check/item/{item_id}",
    name="Check Existence",
    responses={
        status.HTTP_200_OK: {"description": "File exists", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
    },
)
async def check_item_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The ID of the item to check (use `.` to specify root directory)")],
    response: Response,
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Checks the existence of a file or directory.
    """

    item_id = processed_item_id
    user_id = credentials.user_id

    # Get item
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(item_id, root_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Decide type of the item
    if item.is_folder:
        response.status_code = status.HTTP_202_ACCEPTED
        return

    response.status_code = status.HTTP_200_OK


@encrypted_router.post(
    "/check/names",
    name="Check Existence of Multiple Names",
    responses={
        status.HTTP_200_OK: {
            "content": {"text/plain": None, "application/octet-stream": {"example": "See examples in description."}}
        },
    },
    response_class=PlainTextResponse,
)
async def check_names_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    parent_id: Annotated[str, Body(description="The ID of the folder to look in (use `.` to specify root directory)")],
    names: Annotated[list[str], Body(description="The names of the items to look for in the folder")],
):
    """
    Checks the existence of multiple names in a folder.

    The response is a packed bit string.
    - Bit `i` (counting from the first name) is `1` if the `i`-th name exists and `0` if it doesn't.
    - Bits are packed **most significant bit first**: the first name maps to the highest bit
      (`0b10000000`) of the first byte, the eighth name maps to the lowest bit of the first byte,
      the ninth name maps to the highest bit of the second byte, and so on.
    - If `len(names)` is not a multiple of 8, the final byte is padded with `0`s **on the right**
      (the least significant bits). These padding bits carry no information, so clients should
      ignore everything past the `len(names)`-th bit.

    Examples:
    - For 8 names, the byte `0xCD` is `0b11001101` in binary, which means that the first, second,
      fifth, sixth, and eighth names exist and the rest do not.
    - For 8 names, the byte `0xF4` is `0b11110100` in binary, which means that the first four names
      as well as the sixth name exist and the rest do not.
    - For 6 names, the byte `0xF4` is `0b11110100` in binary; truncating to 6 bits gives `0b111101`,
      which means that only the fifth name does not exist. (The trailing `00` is padding.)
    - For 10 names, the bytes `0xFF 0x40` are `0b11111111 0b01000000` in binary; truncating to 10 bits
      gives `0b1111111101`, which means that only the ninth name does not exist. The trailing
      `000000` is padding.
    """

    user_id = credentials.user_id
    root_id = get_user_from_id(user_id).fsitem_id

    # Look up the children of the folder by name
    parent = get_user_item(parent_id, root_id)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    num_names = len(names)
    existing_names = {item.name for item in get_items_in_folder(parent.id)}
    items = [name if name in existing_names else None for name in names]

    bytestring = bytearray()
    curr_byte = 0
    for i, item in enumerate(items):
        curr_byte <<= 1
        curr_byte |= 0 if item is None else 1
        if i % 8 == 7:
            bytestring.append(curr_byte)
            curr_byte = 0

    if num_names % 8 != 0:
        # Right-pad `curr_byte` with zeros to make it 8 bits, then append to the bytestring
        bytestring.append(curr_byte << (8 - (num_names % 8)))

    return PlainTextResponse(bytes(bytestring), media_type="application/octet-stream")


@encrypted_router.head(
    "/check/dir/{folder_id}",
    name="Check Directory Type",
    responses={
        status.HTTP_200_OK: {"description": "Directory exists and is empty", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Directory exists and is not empty"},
        status.HTTP_404_NOT_FOUND: {"description": "Directory not found"},
    },
)
async def check_dir_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    folder_id: Annotated[str, Path(description="The ID of the folder to check (use `.` to specify root directory)")],
    response: Response,
    processed_folder_id: str = Depends(process_path_param("folder_id")),
):
    """
    Checks the existence of a directory, and whether it is empty.
    """

    folder_id = processed_folder_id
    user_id = credentials.user_id

    # Get item
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(folder_id, root_id)
    if not item or not item.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found")

    # Check if directory is empty
    is_empty = is_dir_empty(item.id)
    response.status_code = status.HTTP_200_OK if is_empty else status.HTTP_202_ACCEPTED
