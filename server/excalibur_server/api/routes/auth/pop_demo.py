from typing import Annotated

from fastapi import Body, Depends, WebSocket, WebSocketDisconnect

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials, get_credentials_ws


@router.get("/pop-demo", tags=["debug"])
def demo_get_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Demo endpoint for a GET request.
    """

    return credentials


@router.post("/pop-demo", tags=["debug"])
def demo_post_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    data: Annotated[str, Body(description="Some data")] = "hello world!",
):
    """
    Demo endpoint for a POST request.
    """

    return {
        "credential": credentials,
        "data": data,
    }


@router.post("/pop-demo/encrypted", tags=["debug"])
def demo_post_encrypted_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    data: Annotated[str, Body(description="Some data")] = "hello world!",
):
    """
    Demo endpoint for an encrypted POST request.
    """

    return {
        "credential": credentials,
        "data": data,
    }


@router.websocket("/pop-demo/ws")
async def demo_websocket_endpoint(
    websocket: WebSocket,
    credentials: Annotated[Credentials, Depends(get_credentials_ws)],
):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_text(f"{credentials.username}: {text}")
    except WebSocketDisconnect:
        pass
