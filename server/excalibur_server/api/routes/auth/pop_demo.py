from typing import Annotated

from fastapi import Body, Depends, Path, WebSocket, WebSocketDisconnect

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials, get_credentials_ws


@router.get("/pop-demo", tags=["debug"])
def demo_get_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Demo endpoint for a GET request.
    """

    return credentials


@router.get("/pop-demo-get/{var:path}", tags=["debug"])
def demo_get_with_path_endpoint(
    var: Annotated[str, Path(description="A path variable")],
    credentials: Annotated[Credentials, Depends(get_credentials)],
    parsed_var: str = Depends(process_path_param("var")),
):
    """
    Demo endpoint for a GET request with a path parameter.
    """

    var = parsed_var

    return {
        "credential": credentials,
        "data": var,
    }


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
            await websocket.send_text(f"{credentials.user_id}: {text}")
    except WebSocketDisconnect:
        pass
