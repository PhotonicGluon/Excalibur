from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, Path, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.api.routes.files.move import _move_helper
from excalibur_server.src.auth.credentials import Credentials, get_credentials


@encrypted_router.post(
    "/rename/{path:path}",
    name="Rename Item",
    responses={
        status.HTTP_200_OK: {
            "description": "Item renamed",
            "content": {"text/plain": {"example": "Item renamed", "schema": None}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Item already exists"},
        status.HTTP_412_PRECONDITION_FAILED: {"description": "Cannot rename root directory"},
        status.HTTP_414_URI_TOO_LONG: {"description": "Path too long"},
    },
    response_class=PlainTextResponse,
)
async def rename_path_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[str, Path(description="The item to rename")],
    new_name: Annotated[str, Body(description="The new name for the item at the leaf of the path")],
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Renames a file or directory.

    Cannot rename root directory (`.`).
    """

    path = processed_path
    _move_helper(background_tasks, credentials, "rename", path, None, new_name)
    return "Item renamed"
