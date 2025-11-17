# ruff: noqa: E402
import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, WebSocket, status

from excalibur_server.api.logging import logger
from excalibur_server.src.auth.credentials import get_credentials

router = APIRouter(tags=["files"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)


# Handle folder changes
class FileUpdateManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user] = websocket

    def disconnect(self, user: str):
        del self.active_connections[user]

    async def send_update(self, user: str, path: Path):
        if user in self.active_connections:
            # TODO: Do we encrypt?
            await self.active_connections[user].send_text(path)


file_update_manager = FileUpdateManager()


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
from .retrieval import download_file_endpoint as download_file_endpoint
from .retrieval import listdir_endpoint as listdir_endpoint
from .retrieval import listdir_listener_endpoint as listdir_listener_endpoint
from .updates import rename_path_endpoint as rename_path_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
