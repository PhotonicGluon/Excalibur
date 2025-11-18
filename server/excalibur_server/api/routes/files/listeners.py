from typing import Annotated

from fastapi import Depends, WebSocket, WebSocketDisconnect

from excalibur_server.api.routes.files import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials_ws
from excalibur_server.src.files.update_manager import file_update_manager


@router.websocket("/listen")
async def directory_changes_listener_endpoint(
    websocket: WebSocket, credentials: Annotated[Credentials, Depends(get_credentials_ws)]
):
    """
    Listens for directory changes and sends updates to the client.
    """

    username = credentials.username

    await file_update_manager.connect(username, websocket)
    try:
        # Keep the connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        file_update_manager.disconnect(username)
