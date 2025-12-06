from typing import Annotated

from fastapi import Depends, Query, WebSocket, WebSocketDisconnect

from excalibur_server.api.misc import is_debug
from excalibur_server.api.routes.files import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials_ws
from excalibur_server.src.files.update_manager import file_update_manager


async def _main_logic(username: str, websocket: WebSocket, encrypted: bool):
    conn_id = await file_update_manager.connect(username, websocket, encrypted)
    try:
        # Keep the connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        file_update_manager.disconnect(username, conn_id)


@router.websocket("/listen")
async def directory_changes_listener_endpoint(
    websocket: WebSocket,
    credentials: Annotated[Credentials, Depends(get_credentials_ws)],
    encrypted: Annotated[bool, Query(description="Whether the connection should be encrypted")] = True,
):
    """
    Listens for directory changes and sends updates to the client.
    """

    await _main_logic(credentials.username, websocket, encrypted)


if is_debug():

    @router.websocket("/listen/debug")
    async def directory_changes_listener_debug_endpoint(
        websocket: WebSocket,
        username: Annotated[str, Query()],
        encrypted: Annotated[bool, Query(description="Whether the connection should be encrypted")] = True,
    ):
        """
        Listens for directory changes and sends updates to the client.

        Available only in debug mode.
        """

        await _main_logic(username, websocket, encrypted)
