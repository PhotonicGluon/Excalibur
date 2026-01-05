import time
from asyncio import Lock, sleep
from collections import defaultdict
from pathlib import Path
from uuid import uuid4

from fastapi import WebSocket
from pydantic import BaseModel, ConfigDict

from excalibur_server.api.logging import logger
from excalibur_server.src.exef import ExEF

CONSECUTIVE_TRANSMISSION_DELAY = 0.1  # In seconds


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
        "Dictionary of connection ID to socket object mappings"
        self._connections: dict[str, list[str]] = defaultdict(list)
        "Dictionary of username to connection IDs"
        self._transmissions: dict[tuple[str, Path], Transmission] = defaultdict(Transmission)
        "Dictionary of username-path pairs to transmission info"

    # Private methods
    async def _send_update(self, username: str, path: Path, e2ee_key: bytes):
        """
        Sends an update to a user.

        :param username: The username of the user to send the update to
        :param path: The path of the file that was updated
        :param e2ee_key: The E2EE key to use for encryption
        """

        logger.debug(f"Sending notification for '{username}' folder content change: {path}")

        key = (username, path)
        for connection_id in self._connections[username]:
            active_socket = self._active_sockets[connection_id]
            if active_socket.encrypted:
                await active_socket.websocket.send_bytes(ExEF(e2ee_key).encrypt(str(path).encode("UTF-8")))
            else:
                await active_socket.websocket.send_text(str(path))

        self._transmissions[key].last_time = time.time()
        if self._transmissions[key].lock.locked():
            self._transmissions[key].lock.release()

    # Public methods
    async def connect(self, username: str, websocket: WebSocket, encrypted: bool = True) -> str:
        """
        Connects a user to the update manager.

        :param username: The username of the user to connect
        :param websocket: The websocket to connect
        :param encrypted: Whether the connection should be encrypted
        """

        connection_id = uuid4().hex
        await websocket.accept()
        self._active_sockets[connection_id] = Socket(websocket=websocket, encrypted=encrypted)
        self._connections[username].append(connection_id)
        return connection_id

    def disconnect(self, username: str, connection_id: str):
        """
        Disconnects a user from the update manager.

        :param username: The username of the user to disconnect
        :param connection_id: The connection ID of the user to disconnect
        """

        self._connections[username].remove(connection_id)
        del self._active_sockets[connection_id]

    async def add_update(self, username: str, path: Path, e2ee_key: bytes):
        """
        Adds an update to the update manager.

        :param username: The username of the user to add the update to
        :param path: The path of the file that was updated
        :param e2ee_key: The E2EE key to use for encryption
        """

        if username not in self._connections:
            return

        key = (username, path)
        if time.time() - self._transmissions[key].last_time > CONSECUTIVE_TRANSMISSION_DELAY:
            await self._send_update(username, path, e2ee_key)
            return

        if not self._transmissions[key].lock.locked():
            await self._transmissions[key].lock.acquire()
            await sleep(CONSECUTIVE_TRANSMISSION_DELAY)
            await self._send_update(username, path, e2ee_key)


file_update_manager = FileUpdateManager()
