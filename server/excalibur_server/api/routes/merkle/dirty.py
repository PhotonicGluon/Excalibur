from typing import Annotated
from uuid import UUID

from fastapi import Depends, status

from excalibur_server.api.routes.merkle import encrypted_router, router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_unverified, get_user_from_id, has_unverified


@router.head(
    "/dirty",
    name="Check If Dirty Items Exists",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "No dirty items found"},
        status.HTTP_200_OK: {"description": "Dirty items found"},
    },
)
def has_dirty_items_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Checks if the authenticated user has any dirty items.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    has_dirty_items = has_unverified(root_id)
    if has_dirty_items:
        return status.HTTP_200_OK
    return status.HTTP_204_NO_CONTENT


@encrypted_router.get("/dirty", name="Get Dirty Items", response_model=set[UUID])
def get_dirty_items_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Gets the dirty items for the authenticated user.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return get_unverified(root_id)
