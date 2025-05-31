from typing import Annotated

from fastapi import HTTPException, Path, status

from excalibur_server.api.v1.files.listings import listdir
from excalibur_server.api.v1.files.routes import router
from excalibur_server.api.v1.files.structures import Directory
from excalibur_server.consts import FILES_FOLDER


@router.get(
    "/list/{path:path}",
    name="List Directory Contents",
    responses={
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Invalid path"},
    },
    response_model=Directory,
)
def listdir_endpoint(path: Annotated[str, Path(description="The path to list (use `.` to specify current directory)")]):
    """
    Lists the contents of a directory.

    Any subdirectories in the main directory will *not* have their items listed (i.e. items will be sent as `null`).
    """

    # Check for any attempts at path traversal
    # TODO: Vet this code
    user_path = FILES_FOLDER / path
    user_path = user_path.resolve()
    if not user_path.is_relative_to(FILES_FOLDER):
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Invalid path")

    return listdir(user_path)
