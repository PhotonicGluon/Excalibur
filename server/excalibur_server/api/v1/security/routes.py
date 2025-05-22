from typing import Annotated

from fastapi import Body
import jwt

from excalibur_server.api.v1.security import router
from excalibur_server.api.v1.security.consts import KEY


# TODO: Perform checks before giving tokens
@router.post("/generate-token")
def generate_token(data: Annotated[dict, Body(description="Data to encode")]):
    encoded_jwt = jwt.encode(data, KEY, algorithm="HS256")
    return encoded_jwt
