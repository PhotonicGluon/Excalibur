from typing import Annotated

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.files import add_folder_change, encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.merkle.mutation import Mutation, get_mutation
from excalibur_server.src.db.operations import add_item, get_item_by_path
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.users import get_user_from_id


@encrypted_router.post(
    "/mkdir/{path:path}",
    name="Create Directory",
    responses={
        status.HTTP_201_CREATED: {"description": "Directory created", "content": None},
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid directory name"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_409_CONFLICT: {"description": "Directory already exists"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
)
async def create_directory_endpoint(
    background_tasks: BackgroundTasks,
    credentials: Annotated[Credentials, Depends(get_credentials)],
    path: Annotated[
        str, Path(description="The path to create the new directory at (use `.` to specify root directory)")
    ],
    name: Annotated[str, Body(description="The name of the new directory")],
    mutation: Mutation = Depends(get_mutation),
    processed_path: str = Depends(process_path_param("path")),
):
    """
    Creates a new directory.
    """

    path = processed_path
    user_id = credentials.user_id

    # Get parent ID
    root_id = get_user_from_id(user_id).fsitem_id
    parent = get_item_by_path(root_id, path)
    if not parent or not parent.is_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check directory name
    if "/" in name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid directory name")

    # Create the directory in the database
    new_folder = FSItem(name=name, parent_id=parent.id, root_id=parent.root_id, is_folder=True)
    try:
        add_item(new_folder)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists")

    background_tasks.add_task(add_folder_change, credentials, path)
