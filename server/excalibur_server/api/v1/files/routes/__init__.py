from fastapi import APIRouter, Depends, status

from excalibur_server.api.v1.security.auth import check_credentials

router = APIRouter(
    tags=["files", "encrypted"],
    dependencies=[Depends(check_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

from .checks import check_path_endpoint
from .create import create_directory_endpoint, upload_file_endpoint
from .delete import delete_endpoint
from .retrieval import download_file_endpoint, listdir_endpoint
