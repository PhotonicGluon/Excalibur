import tempfile
from typing import Annotated, Generator

import aiofiles
from fastapi import Body, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.files import router
from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.files.consts import FILE_PROCESS_CHUNK_SIZE
from excalibur_server.src.path import check_path_length, check_path_subdir

MAX_FILE_SIZE = 1024 * 1024  # 1 MB


async def get_spooled_file(request: Request) -> Generator[tempfile.SpooledTemporaryFile, None, None]:
    """
    A dependency that creates a spooled temporary file from the request body.

    :param request: The request object
    :yield: The spooled temporary file
    """

    spooled_file = tempfile.SpooledTemporaryFile(max_size=MAX_FILE_SIZE)
    try:
        async for chunk in request.stream():
            spooled_file.write(chunk)
        spooled_file.seek(0)
        yield spooled_file
    finally:
        spooled_file.close()


@router.post(
    "/upload/{path:path}",
    name="Upload File",
    responses={
        status.HTTP_201_CREATED: {
            "description": "File uploaded",
            "content": {"text/plain": {"example": "File uploaded", "schema": None}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "File already exists (and `force` parameter is not set)"},
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: {"description": "File too large"},
        status.HTTP_414_REQUEST_URI_TOO_LONG: {"description": "File path too long"},
        status.HTTP_417_EXPECTATION_FAILED: {"description": "Uploaded file needs to end with `.exef`"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
    openapi_extra={
        "requestBody": {
            "content": {
                "application/octet-stream": {
                    "schema": {"type": "string", "format": "binary"},
                }
            },
            "required": True,
            "description": "Upload a binary file.",
        }
    },
)
async def upload_file_endpoint(
    path: Annotated[str, Path(description="The path to upload the file to (use `.` to specify root directory)")],
    name: Annotated[str, Query(description="The name of the file to upload. Should end with `.exef`")],
    force: Annotated[bool, Query(description="Force upload (overwrite existing files)")] = False,
    file: tempfile.SpooledTemporaryFile = Depends(get_spooled_file),
):
    """
    Uploads a file to a directory.
    """

    # Check file extension
    if not name.endswith(".exef"):
        raise HTTPException(
            status_code=status.HTTP_417_EXPECTATION_FAILED, detail="Uploaded file needs to end with `.exef`"
        )

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_dir()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check file path length
    file_path = user_path / name
    if not check_path_length(file_path):
        raise HTTPException(status_code=status.HTTP_414_REQUEST_URI_TOO_LONG, detail="File path too long")

    # Check if file already exists
    if not force and file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="File already exists. Use `force` parameter to overwrite."
        )

    # Save the file
    async with aiofiles.open(file_path, "wb") as out_file:
        while content := file.read(FILE_PROCESS_CHUNK_SIZE):
            await out_file.write(content)

    return "File uploaded"


@router.post(
    "/mkdir/{path:path}",
    name="Create Directory",
    responses={
        status.HTTP_201_CREATED: {
            "description": "Directory created",
            "content": {"text/plain": {"example": "Directory created", "schema": None}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Illegal or invalid directory name"},
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a directory"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
        status.HTTP_409_CONFLICT: {"description": "Directory already exists"},
        status.HTTP_414_REQUEST_URI_TOO_LONG: {"description": "Directory path too long"},
    },
    status_code=status.HTTP_201_CREATED,
    response_class=PlainTextResponse,
)
async def create_directory_endpoint(
    path: Annotated[
        str, Path(description="The path to create the new directory at (use `.` to specify root directory)")
    ],
    name: Annotated[str, Body(description="The name of the new directory")],
):
    """
    Creates a new directory.
    """

    # Check for any attempts at path traversal
    user_path, valid = check_path_subdir(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_dir()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a directory")

    # Check if new directory causes issues
    dir_path, valid = check_path_subdir(name, user_path)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Illegal or invalid directory name")

    # Check if directory already exists
    dir_path = user_path / name
    if dir_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists")

    # Check directory path length
    if not check_path_length(dir_path):
        raise HTTPException(status_code=status.HTTP_414_REQUEST_URI_TOO_LONG, detail="Directory path too long")

    # Create the directory
    dir_path.mkdir(parents=True)

    return "Directory created"
