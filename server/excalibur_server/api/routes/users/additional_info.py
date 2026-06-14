from typing import Annotated

from fastapi import Body, HTTPException, Path, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.users import encrypted_router
from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.users import User, get_user, is_user


@encrypted_router.get(
    "/info/get/{username}",
    summary="Get Additional User Info",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    tags=["encrypted"],
    response_class=PlainTextResponse,
)
def get_additional_user_info_endpoint(username: Annotated[str, Path()]):
    """
    Returns the additional user info of a user with the specified username.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user = get_user(username)
    return user.additional_info


@encrypted_router.post(
    "/info/edit/{username}",
    summary="Edit Additional User Info",
    responses={
        status.HTTP_200_OK: {"description": "User info updated", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
    tags=["encrypted"],
)
def edit_additional_user_info_endpoint(username: Annotated[str, Path()], info: Annotated[str, Body()]):
    """
    Edits the additional user info of a user with the specified username.
    """

    with get_session() as session:
        curr_user = session.query(User).filter(User.username == username).first()
        if curr_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        curr_user.additional_info = info
        session.commit()
