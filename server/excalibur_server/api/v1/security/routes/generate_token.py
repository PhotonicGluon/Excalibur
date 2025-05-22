from typing import Annotated

from fastapi import Body

from excalibur_server.api.v1.security import router
from excalibur_server.api.v1.security.auth import generate_token


@router.post("/generate-token", name="Generate Token")
def generate_token_endpoint(data: Annotated[dict, Body(description="Data to encode")]):
    # TODO: Perform checks before giving tokens

    return generate_token(data)
