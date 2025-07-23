from fastapi import WebSocket

from excalibur_server.api.v1.security import router


@router.websocket("/srp")
async def srp_websocket_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the SRP interactions.
    """

    # TODO: Add
    await websocket.accept()
    await websocket.send_text("Hello")
    await websocket.close()
