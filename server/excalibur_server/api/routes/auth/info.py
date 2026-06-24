from typing import Annotated

from fastapi import Path
from pydantic import BaseModel

from excalibur_server.api.routes.auth import router
from excalibur_server.consts import FAKE_USER_UUID
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.users import get_user, get_user_from_id


class AuthInfo(BaseModel):
    auth_protocol: AuthProtocol


@router.get(
    "/info/{username}",
    name="Get User Authentication Info",
    response_model=AuthInfo,
)
def get_user_auth_info_endpoint(username: Annotated[str, Path()]):
    """
    Returns the security details of a user with the specified username.
    """

    # Pre-get the fake user
    # (This is to prevent side-channel client enumeration attacks. See RFC9807 Section 10.9)
    fake_user = get_user_from_id(FAKE_USER_UUID)

    user = get_user(username)
    if user is None:
        user = fake_user

    return AuthInfo.model_validate(user.model_dump())
