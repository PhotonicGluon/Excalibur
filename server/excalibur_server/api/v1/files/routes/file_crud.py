from typing import Annotated

import aiofiles
from fastapi import File, HTTPException, Path, Query, UploadFile, status
from fastapi.responses import FileResponse

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
    path: Annotated[str, Path(description="The path to upload the file to (use `.` to specify current directory)")],
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


@router.get(
    "/download/{path:path}",
    name="Download File",
    responses={
        status.HTTP_200_OK: {
            "content": {"application/octet-stream": {"example": "Some file content. Can be binary."}},
        },
        status.HTTP_404_NOT_FOUND: {"description": "Path not found or is not a file"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Illegal or invalid path"},
    },
    response_class=FileResponse,
)
async def download_file_endpoint(
    path: Annotated[str, Path(description="The file to download")],
):
    """
    Downloads a file.

    MIME type of the downloaded file should be inferred by the client.
    """

    # Check for any attempts at path traversal
    user_path, valid = validate_path(path, FILES_FOLDER)
    if not valid:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Illegal or invalid path")

    if not (user_path.exists() and user_path.is_file()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Path not found or is not a file")

    return FileResponse(user_path, media_type="application/octet-stream")
