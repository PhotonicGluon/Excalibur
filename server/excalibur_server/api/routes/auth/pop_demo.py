from typing import Annotated

from fastapi import Body, Depends

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import get_credentials


@router.get("/pop-demo", tags=["debug"])
def demo_get_endpoint(credential: Annotated[str, Depends(get_credentials)]):
    """
    Demo endpoint for a GET request.
    """

    return credential


@router.post("/pop-demo", tags=["debug"])
def demo_post_endpoint(
    credential: Annotated[str, Depends(get_credentials)],
    data: Annotated[str, Body(description="Some data")] = "hello world!",
):
    """
    Demo endpoint for a POST request.
    """

    return {
        "credential": credential,
        "data": data,
    }


@router.post("/pop-demo/encrypted", tags=["debug"])
def demo_post_encrypted_endpoint(
    credential: Annotated[str, Depends(get_credentials)],
    data: Annotated[str, Body(description="Some data")],
):
    """
    Demo endpoint for an encrypted POST request.
    """

    return {
        "credential": credential,
        "data": data,
    }
