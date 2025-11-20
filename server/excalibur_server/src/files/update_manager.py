from collections import defaultdict
from pathlib import Path
from uuid import uuid4

from fastapi import WebSocket

from excalibur_server.src.exef import ExEF


class FileUpdateManager:
    """
    Manages file update listeners.
    """

    def __init__(self):
        self.active_connections: dict[str, tuple[WebSocket, bool]] = {}
        self.user_connections: dict[str, list[str]] = defaultdict(list)

    async def connect(self, username: str, websocket: WebSocket, encrypted: bool = True):
        """
        Connects a user to the update manager.

        :param username: The username of the user to connect
        :param websocket: The websocket to connect
        :param encrypted: Whether the connection should be encrypted
        """

        connection_id = uuid4().hex
        await websocket.accept()
        self.active_connections[connection_id] = (websocket, encrypted)
        self.user_connections[username].append(connection_id)
        return connection_id

    def disconnect(self, username: str, connection_id: str):
        """
        Disconnects a user from the update manager.

        :param username: The username of the user to disconnect
        :param connection_id: The connection ID of the user to disconnect
        """

        self.user_connections[username].remove(connection_id)
        del self.active_connections[connection_id]

    async def send_update(self, username: str, path: Path, e2ee_key: bytes):
        """
        Sends an update to a user.

        :param username: The username of the user to send the update to
        :param path: The path of the file that was updated
        :param e2ee_key: The E2EE key to use for encryption
        """

        if username not in self.user_connections:
            return

        for connection_id in self.user_connections[username]:
            ws, encrypted = self.active_connections[connection_id]
            if encrypted:
                await ws.send_bytes(ExEF(e2ee_key).encrypt(str(path).encode("UTF-8")))
            else:
                # Just send the path as plaintext
                await ws.send_text(path)


file_update_manager = FileUpdateManager()
