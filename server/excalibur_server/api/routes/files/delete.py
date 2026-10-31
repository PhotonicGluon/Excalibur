from typing import Annotated

from fastapi import BackgroundTasks, Depends, HTTPException, Path, Query, status
from fastapi.responses import Response

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item_fullpath, is_dir_empty, mark_dirty
from excalibur_server.src.files.utils import rmitem
from excalibur_server.src.users import get_user_from_id


@encrypted_router.delete(
    "/delete/{item_id}",
    name="Delete Item",
    responses={
        status.HTTP_200_OK: {"description": "Deleted file", "content": None},
        status.HTTP_202_ACCEPTED: {"description": "Deleted directory"},
        status.HTTP_400_BAD_REQUEST: {"description": "Cannot delete directory if `as_dir` is not set"},
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot delete root directory"},
        status.HTTP_417_EXPECTATION_FAILED: {
            "description": "Cannot delete directory if it is not empty (and `force` is not set)"
        },
    },
)
def delete_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The ID of the item to delete")],
    as_dir: Annotated[bool, Query(description="Delete directory instead of file")] = False,
    force: Annotated[bool, Query(description="Force delete (delete even if directory is not empty)")] = False,
    processed_item_id: str = Depends(process_path_param("item_id")),
    response: Response = ...,
):
    """
    Deletes a file or directory.

    If deleting a directory, you need to specify the `as_dir` parameter. All files and
    subdirectories will be deleted as well.
    """

    item_id = processed_item_id
    user_id = credentials.user_id

    # Get item to delete
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_user_item(item_id, root_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Prohibit deletion of the root directory
    if item.id == root_id:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail="Cannot delete root directory")

    # Handle deletion
    background_tasks.add_task(add_folder_change, credentials, get_item_fullpath(item.id).parent)
    if item.is_folder:
        if not as_dir:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete directory if `as_dir` is not set"
            )
        if not force and not is_dir_empty(item.id):
            raise HTTPException(status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Directory is not empty")

    # Mark ancestor chain as dirty before the item is deleted
    mark_dirty(item.id)

    rmitem(item)
    response.status_code = status.HTTP_202_ACCEPTED if item.is_folder else status.HTTP_200_OK
