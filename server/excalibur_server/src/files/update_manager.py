from pathlib import Path

from fastapi import WebSocket

from excalibur_server.src.exef import ExEF


class FileUpdateManager:
    """
    Manages file update listeners.
    """

    def __init__(self):
        self.active_connections: dict[str, tuple[WebSocket, bool]] = {}

    async def connect(self, username: str, websocket: WebSocket, encrypted: bool = True):
        """
        Connects a user to the update manager.

        :param username: The username of the user to connect
        :param websocket: The websocket to connect
        :param encrypted: Whether the connection should be encrypted
        """

        await websocket.accept()
        self.active_connections[username] = (websocket, encrypted)

    def disconnect(self, username: str):
        """
        Disconnects a user from the update manager.

        :param username: The username of the user to disconnect
        """

        del self.active_connections[username]

    async def send_update(self, username: str, path: Path, e2ee_key: bytes):
        """
        Sends an update to a user.

        :param username: The username of the user to send the update to
        :param path: The path of the file that was updated
        :param e2ee_key: The E2EE key to use for encryption
        """

        if username in self.active_connections:
            ws, encrypted = self.active_connections[username]
            if encrypted:
                await ws.send_bytes(ExEF(e2ee_key).encrypt(str(path).encode("UTF-8")))
            else:
                # Just send the path as plaintext
                await ws.send_text(path)


file_update_manager = FileUpdateManager()
