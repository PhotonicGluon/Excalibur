from typing import Annotated

import aiofiles
from fastapi import File, HTTPException, Path, Query, UploadFile, status
from fastapi.params import Body

from excalibur_server.api.v1.files.consts import FILE_PROCESS_CHUNK_SIZE
from excalibur_server.api.v1.files.routes import router
from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.path import validate_path


@router.post(
    "/upload/{path:path}",
    name="Upload File",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "File already exists (and `force` parameter is not set)"},
        status.HTTP_417_EXPECTATION_FAILED: {"description": "Uploaded file needs to end with `.exef`"},
    },
    status_code=status.HTTP_201_CREATED,
    response_model=str,
)
async def upload_file_endpoint(
    path: Annotated[str, Path(description="The path to upload the file to (use `.` to specify root directory)")],
    file: Annotated[UploadFile, File(description="The *encrypted* file to upload. Should end with `.exef`")],
    force: Annotated[bool, Query(description="Force upload (overwrite existing files)")] = False,
):
    """
    Uploads a file to a directory.
    """

    # Check file extension
    if not file.filename.endswith(".exef"):
        raise HTTPException(
            status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Uploaded file needs to end with `.exef`"
        )

    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_dir()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check if file already exists
    file_path = user_path / file.filename
    if not force and file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="File already exists. Use `force` parameter to overwrite."
        )

    # Save the file
    async with aiofiles.open(file_path, "wb") as out_file:
        while content := await file.read(FILE_PROCESS_CHUNK_SIZE):
            await out_file.write(content)

    return "File uploaded"


@router.post(
    "/mkdir/{path:path}",
    name="Create Directory",
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid directory name"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Directory already exists"},
    },
    status_code=status.HTTP_201_CREATED,
    response_model=str,
)
async def create_directory_endpoint(
    path: Annotated[
        str, Path(description="The path to create the new directory at (use `.` to specify root directory)")
    ],
    name: Annotated[str, Body(description="The name of the new directory")],
):
    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_dir()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check if new directory causes issues
    dir_path, valid = validate_path(name, user_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid directory name")

    # Check if file already exists
    dir_path = user_path / name
    if dir_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists")

    # Create the directory
    dir_path.mkdir(parents=True)

    return "Directory created"
