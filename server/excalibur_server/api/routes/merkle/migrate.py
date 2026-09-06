from typing import Annotated
from uuid import UUID

from fastapi import Body, Depends, HTTPException, status
from pydantic import Base64Bytes, BaseModel
from sqlalchemy.orm import Session

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.merkle.structures import AttestationBase
from excalibur_server.src.db.operations import (
    count_items_with_root,
    get_session,
    get_unverified,
    get_user_from_id,
)
from excalibur_server.src.db.tables import Attestation, FSItem, VaultState


class MigrationEntry(BaseModel):
    """
    The Merkle data for a single item, submitted during a migration.
    """

    node_hash: Base64Bytes
    "Keyed MAC of the subtree rooted at this item"
    content_mac: Base64Bytes | None = None
    "Keyed MAC binding the file's AEAD tags to its identity, or None for folders"


def _refresh_counts(session: Session, root_id: UUID, vault_state: VaultState):
    """
    Recomputes a vault state's migration progress counters from the database.

    Must be given the caller's own session, since the counters have to take the caller's uncommitted
    writes into account.
    """

    vault_state.total_count = count_items_with_root(root_id, session)
    vault_state.migrated_count = vault_state.total_count - len(get_unverified(root_id, session))


@encrypted_router.post(
    "/migrate",
    name="Begin Migration",
    responses={
        status.HTTP_200_OK: {"description": "Migration started"},
        status.HTTP_409_CONFLICT: {"description": "Vault already has a Merkle tree"},
    },
    response_model=VaultState,
)
def begin_migration_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Starts a migration of the authenticated user's vault to a Merkle tree.

    Moves the vault from the `NONE` status to the `MIGRATING` status, stamping the number of items
    that need hashes along the way.

    Note that ordinary, non-Merkle tree verified writes may continue during a migration. Any item
    written while the migration is in progress is treated as another item that needs to be filled
    in.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id

    with get_session() as session, session.begin():
        vault_state = session.get(VaultState, root_id)
        if vault_state is None:
            vault_state = VaultState(root_id=root_id)
        elif vault_state.merkle_status != MerkleStatus.NONE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vault is already in the '{vault_state.merkle_status.value}' state",
            )

        vault_state.merkle_status = MerkleStatus.MIGRATING
        vault_state.current_generation = 0
        _refresh_counts(session, root_id, vault_state)
        session.add(vault_state)

        result = vault_state.model_copy()

    return result


@encrypted_router.post(
    "/migrate/fill",
    name="Fill Migration Data",
    responses={
        status.HTTP_200_OK: {"description": "Chunk accepted"},
        status.HTTP_409_CONFLICT: {"description": "Vault is not migrating, or the chunk is invalid"},
    },
    response_model=VaultState,
)
def fill_migration_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    entries: Annotated[dict[UUID, MigrationEntry], Body(description="Mapping of item IDs to their Merkle data")],
):
    """
    Submits a chunk of Merkle data for an in-progress migration.

    This endpoint is resumable. That is,
    - chunks may be submitted in any order; and
    - re-submitting a chunk simply overwrites the data that was previously stored for those items.

    Identify data that needs migration using the `/merkle/dirty` endpoint.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id

    with get_session() as session, session.begin():
        vault_state = session.get(VaultState, root_id)
        if vault_state is None or vault_state.merkle_status != MerkleStatus.MIGRATING:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vault is not migrating")

        for item_id, entry in entries.items():
            item = session.get(FSItem, item_id)
            if item is None or item.root_id != root_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail=f"Item '{item_id}' is not in this vault"
                )

            if item.is_folder and entry.content_mac is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail=f"Item '{item_id}' is a folder and has no content MAC"
                )
            if not item.is_folder and entry.content_mac is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail=f"Item '{item_id}' is a file and needs a content MAC"
                )

            item.node_hash = entry.node_hash
            item.content_mac = entry.content_mac
            item.version += 1
            session.add(item)

        _refresh_counts(session, root_id, vault_state)
        session.add(vault_state)

        result = vault_state.model_copy()

    return result


@encrypted_router.post(
    "/migrate/complete",
    name="Complete Migration",
    responses={
        status.HTTP_200_OK: {"description": "Migration completed"},
        status.HTTP_409_CONFLICT: {"description": "Vault is not migrating, or the attestation is invalid"},
    },
    response_model=Attestation,
)
def complete_migration_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    attestation: Annotated[AttestationBase, Body(description="The generation 1 attestation for the vault")],
):
    """
    Completes an in-progress migration, moving the vault to the `ACTIVE` status.

    Every item in the vault must have its Merkle data filled in before this is run.
    """

    root_id = get_user_from_id(credentials.user_id).fsitem_id

    # Structural checks on the submitted attestation
    if attestation.generation != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="The migration attestation must be for generation 1"
        )
    if attestation.prev_root_hash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="The migration attestation must not chain to a previous root"
        )

    new_attestation = Attestation.from_base(attestation, root_id)
    result = new_attestation.model_copy()

    with get_session() as session, session.begin():
        vault_state = session.get(VaultState, root_id)
        if vault_state is None or vault_state.merkle_status != MerkleStatus.MIGRATING:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vault is not migrating")

        unverified = get_unverified(root_id, session)
        if unverified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"Migration is incomplete; {len(unverified)} items remain"
            )

        root = session.get(FSItem, root_id)
        if root is None or root.node_hash != attestation.root_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attestation's root hash does not match the vault's root node hash",
            )

        session.add(new_attestation)

        vault_state.merkle_status = MerkleStatus.ACTIVE
        vault_state.current_generation = new_attestation.generation
        _refresh_counts(session, root_id, vault_state)
        session.add(vault_state)

    return result
