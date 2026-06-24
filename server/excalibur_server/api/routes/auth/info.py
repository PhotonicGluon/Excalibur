from typing import Annotated

from fastapi import HTTPException, Path, status
from pydantic import BaseModel

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.users import get_user


class AuthInfo(BaseModel):
    auth_protocol: AuthProtocol


@router.get(
    "/info/{username}",
    name="Get User Authentication Info",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    response_model=AuthInfo,
)
def get_user_auth_info_endpoint(username: Annotated[str, Path()]):
    """
    Returns the security details of a user with the specified username.
    """

    user = get_user(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return AuthInfo.model_validate(user.model_dump())
