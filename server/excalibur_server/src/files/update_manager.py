from pathlib import Path

from fastapi import WebSocket


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
