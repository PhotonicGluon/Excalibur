# ruff: noqa: E402
import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, status

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.logging import logger
from excalibur_server.api.misc import is_debug
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.files.update_manager import file_update_manager

router = APIRouter(tags=["files"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)


# Handle folder changes
def add_folder_change(credentials: Credentials, path: Path):
    if path == "":
        path = "."

    logger.debug(f"Noticed '{credentials.username}' folder content change: {path}")
    asyncio.run(file_update_manager.send_update(credentials.username, path, MASTER_KEYS_CACHE[credentials.comm_uuid]))


# Add endpoints
from .checks import check_path_endpoint as check_path_endpoint
from .delete import delete_endpoint as delete_endpoint
from .file import download_file_endpoint as download_file_endpoint
from .file import upload_file_endpoint as upload_file_endpoint
from .folder import create_directory_endpoint as create_directory_endpoint
from .folder import directory_changes_listener_endpoint as directory_changes_listener_endpoint
from .folder import listdir_endpoint as listdir_endpoint
from .rename import rename_path_endpoint as rename_path_endpoint

if is_debug():
    from .folder import directory_changes_listener_debug_endpoint as directory_changes_listener_debug_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
