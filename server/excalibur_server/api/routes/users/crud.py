from typing import Annotated

from fastapi import HTTPException, Path, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.users import router
from excalibur_server.env import is_debug
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
