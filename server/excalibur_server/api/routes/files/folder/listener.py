from typing import Annotated

from fastapi import Depends, Query, WebSocket, WebSocketDisconnect, WebSocketException

from excalibur_server.api.routes.files import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials_ws
from excalibur_server.src.files.update_manager import file_update_manager


@router.websocket("/listen")
async def directory_changes_listener_endpoint(
    websocket: WebSocket,
    credentials: Annotated[Credentials, Depends(get_credentials_ws)],
    encrypted: Annotated[bool, Query(description="Whether the connection should be encrypted")] = True,
):
    """
    Listens for directory changes and sends updates to the client.
    """

    try:
        await file_update_manager.connect(credentials, websocket, encrypted)
    except ValueError:
        raise WebSocketException(code=4000, reason="Duplicate connection")

    try:
        # Keep the connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        file_update_manager.disconnect(credentials)
