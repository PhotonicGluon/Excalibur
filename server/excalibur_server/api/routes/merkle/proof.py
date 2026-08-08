from base64 import b64encode
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Path, status
from pydantic import BaseModel, field_serializer

from excalibur_server.api.path_handling import process_path_param
from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_item, get_items_in_folder, get_user_from_id
from excalibur_server.src.db.tables import FSItem


class InclusionProofStep(BaseModel):
    id: UUID
    "Unique identifier for the filesystem item"
    children: list[tuple[UUID, bytes | None]]
    "List of (child_id, child_node_hash) pairs"

    # Field serialization
    @field_serializer("children")
    def serialize_children(self, value: list[tuple[UUID, bytes | None]]) -> list[tuple[str, str | None]]:
        return [
            (str(child_id), b64encode(child_hash).decode("utf-8") if child_hash else None)
            for child_id, child_hash in value
        ]


class InclusionProof(BaseModel):
    item: FSItem
    steps: list[InclusionProofStep]


@encrypted_router.get(
    "/proof/{item_id}",
    name="Get Inclusion Proof",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Item not found"},
    },
    response_model=InclusionProof,
)
def inclusion_proof_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    item_id: Annotated[str, Path(description="The item ID to get the inclusion proof of")],
    processed_item_id: str = Depends(process_path_param("item_id")),
):
    """
    Get the inclusion proof for a specific item in the Merkle tree.
    """

    item_id: UUID = UUID(processed_item_id)
    user_id = credentials.user_id

    # Get item and verify it belongs to the user
    root_id = get_user_from_id(user_id).fsitem_id
    item = get_item(item_id)
    if not item or item.root_id != root_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Generate inclusion proof
    steps = []
    current_item = item
    while current_item.parent_id is not None:
        parent = get_item(current_item.parent_id)
        siblings = get_items_in_folder(parent.id)  # If not a folder, just returns []

        steps.append(
            InclusionProofStep(
                id=parent.id,
                children=[(sibling.id, sibling.node_hash) for sibling in siblings],
            )
        )
        current_item = parent

    return InclusionProof(item=item, steps=steps)
