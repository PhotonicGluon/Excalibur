from typing import Annotated, Self
from uuid import UUID

from fastapi import Depends, Query, status
from pydantic import BaseModel, field_serializer

from excalibur_server.api.routes.merkle import encrypted_router, router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_unverified_items, get_user_from_id, has_unverified
from excalibur_server.src.db.tables import FSItem


class DirtyItem(BaseModel):
    """
    An item whose Merkle data needs to be (re)computed by the client.
    """

    id: UUID
    "Unique identifier for the filesystem item"
    parent_id: UUID | None
    "Parent directory ID, or None for the user's root folder"
    name: str
    "Item name"
    is_folder: bool
    "Whether the item is a folder"
    version: int
    "Monotonic counter bumped on every mutation to this node"
    needs_content_mac: bool
    "Whether the client must also submit a content MAC for this item"

    @classmethod
    def from_fsitem(cls, item: FSItem) -> Self:
        """
        Creates a `DirtyItem` from a filesystem item.

        :param item: the filesystem item
        :return: the dirty item
        """

        return cls(
            id=item.id,
            parent_id=item.parent_id,
            name=item.name,
            is_folder=item.is_folder,
            version=item.version,
            needs_content_mac=not item.is_folder and item.content_mac is None,
        )

    # Field serialization
    @field_serializer("id", "parent_id")
    def serialize_uuid(self, value: UUID | None) -> str | None:
        return str(value) if value is not None else None


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


@encrypted_router.get("/dirty", name="Get Dirty Items", response_model=list[DirtyItem])
def get_dirty_items_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    limit: Annotated[
        int | None, Query(gt=0, description="Maximum number of items to return, or all of them if omitted")
    ] = None,
    offset: Annotated[int, Query(ge=0, description="Number of items to skip")] = 0,
):
    """
    Gets the dirty items for the authenticated user.

    Use `limit` and `offset` to page the items.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return [DirtyItem.from_fsitem(item) for item in get_unverified_items(root_id, limit=limit, offset=offset)]
