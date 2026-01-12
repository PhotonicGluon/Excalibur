import time
from asyncio import Lock, sleep
from collections import defaultdict
from pathlib import Path

from fastapi import WebSocket
from pydantic import BaseModel, ConfigDict

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.logging import logger
from excalibur_server.src.auth.credentials import Credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.exef import ExEF


class Socket(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    websocket: WebSocket
    encrypted: bool


class Transmission(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    lock: Lock = Lock()
    last_time: float = 0


class FileUpdateManager:
    """
    Manages file update listeners.
    """

    def __init__(self):
        self._active_sockets: dict[str, Socket] = {}
        "Dictionary of communications UUID to socket object mappings"
        self._connections: dict[str, list[str]] = defaultdict(list)
        "Dictionary of username to communications UUID"
        self._transmissions: dict[tuple[str, Path], Transmission] = defaultdict(Transmission)
        "Dictionary of username-path pairs to transmission info"

    # Private methods
    async def _send_update(self, credentials: Credentials, path: Path):
        """
        Sends an update to a user.

        :param credentials: The credentials of the user to send the update to
        :param path: The path of the file that was updated
        """

        username = credentials.username
        logger.debug(f"Sending notification for '{username}' folder content change: {path}")

        key = (username, path)
        for comm_uuid in self._connections[username]:
            active_socket = self._active_sockets[comm_uuid]
            if active_socket.encrypted:
                e2ee_key = MASTER_KEYS_CACHE[comm_uuid]
                await active_socket.websocket.send_bytes(ExEF(e2ee_key).encrypt(str(path).encode("UTF-8")))
            else:
                await active_socket.websocket.send_text(str(path))

        self._transmissions[key].last_time = time.time()
        if self._transmissions[key].lock.locked():
            self._transmissions[key].lock.release()

    # Public methods
    async def connect(self, credentials: Credentials, websocket: WebSocket, encrypted: bool = True):
        """
        Connects a user to the update manager.

        :param credentials: The credentials of the user to connect
        :param websocket: The websocket to connect
        :param encrypted: Whether the connection should be encrypted
        """

        await websocket.accept()
        self._active_sockets[credentials.comm_uuid] = Socket(websocket=websocket, encrypted=encrypted)
        self._connections[credentials.username].append(credentials.comm_uuid)

    def disconnect(self, credentials: Credentials):
        """
        Disconnects a user from the update manager.

        :param credentials: The credentials of the user to disconnect
        """

        self._connections[credentials.username].remove(credentials.comm_uuid)
        self._active_sockets.pop(credentials.comm_uuid, None)

    async def add_update(self, credentials: Credentials, path: Path):
        """
        Adds an update to the update manager.

        :param credentials: The credentials of the user to notify
        :param path: The path of the file that was updated
        """

        username = credentials.username
        if username not in self._connections:
            return

        key = (username, path)
        if time.time() - self._transmissions[key].last_time > CONFIG.server.consecutive_transmission_delay * 1e-3:
            await self._send_update(credentials, path)
            return

        if not self._transmissions[key].lock.locked():
            await self._transmissions[key].lock.acquire()
            await sleep(CONFIG.server.consecutive_transmission_delay * 1e-3)
            await self._send_update(credentials, path)


file_update_manager = FileUpdateManager()
