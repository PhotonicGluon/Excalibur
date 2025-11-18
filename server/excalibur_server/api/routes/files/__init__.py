# ruff: noqa: E402
import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, status

from excalibur_server.api.logging import logger
from excalibur_server.src.auth.credentials import get_credentials
from excalibur_server.src.files.update_manager import file_update_manager

router = APIRouter(tags=["files"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)


# Handle folder changes
def add_folder_change(user: str, path: Path):
    if path == "":
        path = "."

    logger.debug(f"Noticed '{user}' folder content change: {path}")
    asyncio.run(file_update_manager.send_update(user, path))


# Add endpoints
from .checks import check_path_endpoint as check_path_endpoint
from .create import create_directory_endpoint as create_directory_endpoint
from .create import upload_file_endpoint as upload_file_endpoint
from .delete import delete_endpoint as delete_endpoint
from .listeners import directory_changes_listener_endpoint as directory_changes_listener_endpoint
from .retrieval import download_file_endpoint as download_file_endpoint
from .retrieval import listdir_endpoint as listdir_endpoint
from .updates import rename_path_endpoint as rename_path_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
