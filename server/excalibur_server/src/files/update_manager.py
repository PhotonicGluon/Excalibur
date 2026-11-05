import time
from asyncio import Lock, sleep
from collections import defaultdict

from fastapi import WebSocket
from fastapi.websockets import WebSocketState
from pydantic import BaseModel, ConfigDict

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.logging import logger
from excalibur_server.src.auth.credentials import Credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF


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
        self._active_sockets: dict[str, list[Socket]] = defaultdict(list)
        "Dictionary of communications UUID to list of sockets"
        self._connections: dict[str, list[str]] = defaultdict(list)
        "Dictionary of username to communications UUID"
        self._transmissions: dict[tuple[str, str], Transmission] = defaultdict(Transmission)
        "Dictionary of (username, folder ID) pairs to transmission info"

    # Private methods
    async def _send_update(self, credentials: Credentials, folder_id: str):
        """
        Sends an update to a user.

        :param credentials: the credentials of the user to send the update to
        :param folder_id: the ID of the folder whose contents changed (`.` for the root folder)
        """

        user_id = credentials.user_id
        logger.debug(f"Sending notification for '{user_id}' folder content change: {folder_id}")

        key = (user_id, folder_id)
        for comm_uuid in self._connections[user_id]:
            for active_socket in self._active_sockets[comm_uuid]:
                if active_socket.encrypted:
                    e2ee_key = MASTER_KEYS_CACHE[comm_uuid]
                    await active_socket.websocket.send_bytes(ExEF(e2ee_key).encrypt(folder_id.encode("UTF-8")))
                else:
                    await active_socket.websocket.send_text(folder_id)

        self._transmissions[key].last_time = time.time()
        if self._transmissions[key].lock.locked():
            self._transmissions[key].lock.release()

    # Public methods
    async def connect(self, credentials: Credentials, websocket: WebSocket, encrypted: bool = True):
        """
        Connects a user to the update manager.

        :param credentials: the credentials of the user to connect
        :param websocket: the websocket to connect
        :param encrypted: whether the connection should be encrypted
        """

        self._active_sockets[credentials.comm_uuid].append(Socket(websocket=websocket, encrypted=encrypted))
        self._connections[credentials.user_id].append(credentials.comm_uuid)

    async def disconnect(self, credentials: Credentials):
        """
        Disconnects a user from the update manager if the user is connected.

        :param credentials: the credentials of the user to disconnect
        """

        if credentials.comm_uuid in self._connections[credentials.user_id]:
            self._connections[credentials.user_id].remove(credentials.comm_uuid)

        for active_socket in self._active_sockets.get(credentials.comm_uuid, []):
            if active_socket.websocket.client_state == WebSocketState.CONNECTED:
                await active_socket.websocket.close()

        self._active_sockets.pop(credentials.comm_uuid, None)

    async def add_update(self, credentials: Credentials, folder_id: str):
        """
        Adds an update to the update manager.

        :param credentials: the credentials of the user to notify
        :param folder_id: the ID of the folder whose contents changed (`.` for the root folder)
        """

        user_id = credentials.user_id
        if user_id not in self._connections:
            return

        key = (user_id, folder_id)
        if time.time() - self._transmissions[key].last_time > CONFIG.server.consecutive_transmission_delay * 1e-3:
            await self._send_update(credentials, folder_id)
            return

        if not self._transmissions[key].lock.locked():
            await self._transmissions[key].lock.acquire()
            await sleep(CONFIG.server.consecutive_transmission_delay * 1e-3)
            await self._send_update(credentials, folder_id)


file_update_manager = FileUpdateManager()
