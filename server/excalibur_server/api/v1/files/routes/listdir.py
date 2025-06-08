from typing import Annotated

from fastapi import HTTPException, Path, status

from excalibur_server.api.v1.files.listings import listdir
from excalibur_server.api.v1.files.routes import router
from excalibur_server.api.v1.files.structures import Directory
from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.path import validate_path


@router.get(
    "/list/{path:path}",
    name="List Directory Contents",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
    response_model=Directory,
)
def listdir_endpoint(path: Annotated[str, Path(description="The path to list (use `.` to specify current directory)")]):
    """
    Lists the contents of a directory.

    Any subdirectories in the main directory will *not* have their items listed (i.e. items will be sent as `null`).
    """

    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    contents = listdir(user_path)
    if contents is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    return contents
