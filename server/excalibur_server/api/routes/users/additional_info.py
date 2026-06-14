from typing import Annotated

from fastapi import Body, Depends, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.users import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_session
from excalibur_server.src.users import User, get_user_from_id


@encrypted_router.get(
    "/info/get",
    summary="Get Additional User Info",
    tags=["encrypted"],
    response_class=PlainTextResponse,
)
def get_additional_user_info_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Returns the additional user info of the currently authenticated user.
    """

    user = get_user_from_id(credentials.user_id)
    return user.additional_info


@encrypted_router.post(
    "/info/edit",
    summary="Edit Additional User Info",
    responses={
        status.HTTP_200_OK: {"description": "User info updated", "content": None},
    },
    tags=["encrypted"],
)
def edit_additional_user_info_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)], info: Annotated[str, Body()]
):
    """
    Edits the additional user info of the currently authenticated user.
    """

    with get_session() as session:
        db_user = session.get(User, credentials.user_id)
        db_user.additional_info = info
        session.commit()
