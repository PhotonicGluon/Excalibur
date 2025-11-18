from base64 import b64encode
from pathlib import Path

from Crypto.Cipher import AES
from fastapi import WebSocket


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
                # Encrypt the path using the end-to-end encryption key
                cipher = AES.new(e2ee_key, AES.MODE_GCM)
                path_enc = cipher.encrypt(str(path).encode("UTF-8"))
                tag = cipher.digest()
                await ws.send_json(
                    {
                        "nonce": b64encode(cipher.nonce).decode("utf-8"),
                        "path": b64encode(path_enc).decode("utf-8"),
                        "tag": b64encode(tag).decode("utf-8"),
                    }
                )
            else:
                # Just send the path as plaintext
                await ws.send_text(path)


file_update_manager = FileUpdateManager()
