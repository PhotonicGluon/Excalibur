from typing import Annotated

from fastapi import Body, Depends

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials


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
