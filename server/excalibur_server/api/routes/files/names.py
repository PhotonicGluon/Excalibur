from typing import Annotated
from uuid import UUID

from fastapi import Body, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, field_serializer
from sqlalchemy.exc import IntegrityError

from excalibur_server.api.routes.files import encrypted_router, router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_pending_name_items, get_session, has_pending_names, mark_dirty
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import EncryptedName
from excalibur_server.src.users import get_user_from_id


class PendingName(BaseModel):
    """
    An item that still has a plaintext name, which needs to be replaced by an encrypted one.
    """

    id: UUID
    "Unique identifier for the filesystem item"
    parent_id: UUID
    "Parent directory ID"
    is_folder: bool
    "Whether the item is a folder"
    name: str
    "The item's plaintext name"

    # Field serialization
    @field_serializer("id", "parent_id")
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)


@router.head(
    "/names/pending",
    name="Check If Plaintext Names Exist",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "No items have a plaintext name"},
        status.HTTP_200_OK: {"description": "Some items still have a plaintext name"},
    },
)
def has_pending_names_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    response: Response,
):
    """
    Checks if the authenticated user has any items that still have a plaintext name.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id
    response.status_code = status.HTTP_200_OK if has_pending_names(root_id) else status.HTTP_204_NO_CONTENT


@encrypted_router.get("/names/pending", name="Get Plaintext Names", response_model=list[PendingName])
def get_pending_names_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    limit: Annotated[
        int | None, Query(gt=0, description="Maximum number of items to return, or all of them if omitted")
    ] = None,
    offset: Annotated[int, Query(ge=0, description="Number of items to skip")] = 0,
):
    """
    Gets the items of the authenticated user that still have a plaintext name.

    The root folder is never included. The items are ordered by ID, and `limit` and `offset` can be
    used to page them.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id
    return [
        PendingName(id=item.id, parent_id=item.parent_id, is_folder=item.is_folder, name=item.name)
        for item in get_pending_name_items(root_id, limit=limit, offset=offset)
    ]


@encrypted_router.post(
    "/names/fill",
    name="Fill Encrypted Names",
    responses={
        status.HTTP_200_OK: {"description": "Chunk accepted"},
        status.HTTP_409_CONFLICT: {"description": "An item is not in this vault, or a name already exists"},
    },
)
def fill_names_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    names: Annotated[
        dict[UUID, EncryptedName],
        Body(
            description="Mapping of item IDs to their encrypted names",
            examples=[
                {
                    "node-uuid-1": {"name_enc": "base64-name-1", "name_tag": "base64-tag-1"},
                    "node-uuid-2": {"name_enc": "base64-name-2", "name_tag": "base64-tag-2"},
                }
            ],
        ),
    ],
):
    """
    Submits a chunk of encrypted names, replacing the plaintext names of those items.

    The chunk is applied as a whole. If any item is invalid or any name clashes with another, none of
    the items in the chunk are changed.

    This endpoint is resumable. That is,
    - chunks may be submitted in any order; and
    - re-submitting a chunk simply overwrites the names that were previously stored for those items.

    The items (and their ancestors) are marked as dirty, since their names are part of the Merkle
    tree. Identify the items that need migration using the `/names/pending` endpoint.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id

    with get_session() as session:
        try:
            with session.begin():
                for item_id, name in names.items():
                    item = session.get(FSItem, item_id)
                    if item is None or item.root_id != root_id or item.parent_id is None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT, detail=f"Item '{item_id}' is not in this vault"
                        )

                    item.name = None  # The plaintext name is erased
                    item.name_enc = name.name_enc
                    item.name_tag = name.name_tag
                    session.add(item)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A name already exists")

    for item_id in names:
        mark_dirty(item_id)
