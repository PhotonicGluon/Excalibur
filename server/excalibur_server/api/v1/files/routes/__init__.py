from fastapi import APIRouter, Depends, status

from excalibur_server.api.v1.security.auth import check_credentials

router = APIRouter(
    tags=["files", "encrypted"],
    dependencies=[Depends(check_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

from .file_crud import upload_file_endpoint, download_file_endpoint
from .listdir import listdir_endpoint
