from typing import Annotated

from fastapi import Depends, HTTPException, Path, status

from excalibur_server.api.path_handling import get_user_item, process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.files.structures import Directory
from excalibur_server.src.files.utils import listdir
from excalibur_server.src.users import get_user_from_id


@encrypted_router.get(
    "/list/{folder_id}",
    name="List Directory Contents",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Folder not found or is not a directory"},
    },
    response_model=Directory,
)
def listdir_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    folder_id: Annotated[str, Path(description="The ID of the folder to list (use `.` to specify root directory)")],
    processed_folder_id: str = Depends(process_path_param("folder_id")),
):
    """
    Lists the contents of a directory.

    Any subdirectories in the main directory will *not* have their items returned.
    """

    folder_id = processed_folder_id
    user_id = credentials.user_id

    # Get folder's ID
    root_id = get_user_from_id(user_id).fsitem_id
    folder = get_user_item(folder_id, root_id)
    if folder is None or not folder.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found or is not a directory")

    # List the directory
    return listdir(folder.id)
