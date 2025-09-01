from base64 import b64decode, b64encode
from typing import Literal

from fastapi import WebSocket as WebSocket
from pydantic import BaseModel, model_serializer


class WebSocketMsg(BaseModel):
    """
    A message sent over a WebSocket connection.
    """

    data: str | bytes
    "Data of the message"
    status: Literal["OK", "ERR"] | None
    "Status of the message"

    def __init__(self, data: str | bytes = "", status: Literal["OK", "ERR"] | None = None, binary: bool = False):
        if binary:
            assert isinstance(data, str)
            data = b64decode(data.encode("utf-8"))

        super().__init__(data=data, status=status)

    @model_serializer
    def serialize(self):
        data = {} if self.status is None else {"status": self.status}
        if isinstance(self.data, bytes):
            data.update({"binary": True, "data": b64encode(self.data).decode("utf-8")})
        else:
            data.update({"binary": False, "data": self.data})

        return data


class WebSocketManager:
    """
    A manager for a WebSocket connection.
    """

    def __init__(self, ws: WebSocket):
        """
        Initialize the WebSocket manager.

        :param ws: the WebSocket connection
        """

        self._ws = ws

    async def accept(self):
        """
        Accept the WebSocket connection.
        """

        await self._ws.accept()

    async def close(self):
        """
        Close the WebSocket connection.
        """

        await self._ws.close()

    async def send(self, msg: WebSocketMsg):
        """
        Send a message over the WebSocket connection.

        :param msg: the message to send
        """

        await self._ws.send_json(msg.serialize())

    async def receive(self) -> WebSocketMsg:
        """
        Receive a message from the WebSocket connection.

        :return: the received message
        """

        return WebSocketMsg(**await self._ws.receive_json())
