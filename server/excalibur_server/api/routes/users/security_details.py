from base64 import b64encode
from typing import Annotated

from fastapi import HTTPException, Path, status
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.users import router
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.users import get_user, is_user


class SecurityDetails(BaseModel):
    auk_salt: bytes
    keygen_function: str
    auth_protocol: AuthProtocol

    @field_serializer("auk_salt")
    def serialize_salts(self, b: bytes | None, _info) -> str | None:
        if b is None:
            return None
        return b64encode(b).decode("utf-8")


@router.get(
    "/security/{username}",
    summary="Get User Security Details",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    response_model=SecurityDetails,
)
def get_user_security_details_endpoint(username: Annotated[str, Path()]):
    """
    Returns the security details of a user with the specified username.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return SecurityDetails.model_validate(user.model_dump())
