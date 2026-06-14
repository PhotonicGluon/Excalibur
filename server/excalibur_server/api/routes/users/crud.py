from typing import Annotated

from fastapi import Body, Depends, HTTPException, Path, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.routes.users import encrypted_router, router
from excalibur_server.env import is_debug
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_session
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import is_user, remove_user


@router.head(
    "/check/{username}",
    summary="Check User Existence",
    responses={
        status.HTTP_200_OK: {"description": "User exists", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "User not found"},
    },
)
def check_user_endpoint(username: Annotated[str, Path()]):
    """
    Checks if a user with the specified username exists in the database.
    """

    if not is_user(username):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@encrypted_router.put(
    "/edit/username",
    summary="Edit Username",
    responses={
        status.HTTP_200_OK: {"description": "Username updated", "content": None},
        status.HTTP_409_CONFLICT: {"description": "User already exists"},
    },
)
def edit_username_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    new_username: Annotated[str, Body()],
):
    """
    Edits the username of the current user.
    """

    with get_session() as session:
        try:
            with session.begin():
                db_user = session.get(User, credentials.user_id)
                db_user.username = new_username
                session.add(db_user)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")


if is_debug():
    # Include this endpoint only in debug mode
    @router.delete(
        "/remove/{username}",
        name="Remove User",
        tags=["debug"],
        response_class=PlainTextResponse,
    )
    def remove_user_endpoint(username: Annotated[str, Path()]):
        """
        Removes a user from the database.
        """

        if not is_user(username):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        remove_user(username)
