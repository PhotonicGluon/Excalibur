from typing import Annotated

from fastapi import Depends, status

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_items_with_root
from excalibur_server.src.users import get_user_from_id


@encrypted_router.get(
    "/count",
    name="Count All Items",
    responses={
        status.HTTP_200_OK: {
            "content": {"application/json": {"example": 123}},
        },
    },
    response_model=int,
)
def count_all_items_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]) -> int:
    """
    Gets the number of items owned by the authenticated user.
    """

    user_id = credentials.user_id

    root_id = get_user_from_id(user_id).fsitem_id
    fsitems = get_items_with_root(root_id)
    return len(fsitems)
