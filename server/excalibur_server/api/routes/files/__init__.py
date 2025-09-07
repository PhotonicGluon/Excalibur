# ruff: noqa: E402
from fastapi import APIRouter, Depends, status

from excalibur_server.src.auth.credentials import get_credentials

router = APIRouter(
    tags=["files", "encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

from .checks import check_path_endpoint as check_path_endpoint
from .create import create_directory_endpoint as create_directory_endpoint
from .create import upload_file_endpoint as upload_file_endpoint
from .delete import delete_endpoint as delete_endpoint
from .retrieval import download_file_endpoint as download_file_endpoint
from .retrieval import listdir_endpoint as listdir_endpoint
from .updates import rename_path_endpoint as rename_path_endpoint
