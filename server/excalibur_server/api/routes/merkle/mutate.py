from typing import Annotated

from fastapi import Body, Depends, HTTPException, status

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.merkle.mutation import Mutation, mutation_check
from excalibur_server.src.db.operations import (
    count_items_with_root,
    get_latest_attestation,
    get_missing_content_macs,
    get_session,
    get_unverified,
    get_user_from_id,
    get_vault_state,
)
from excalibur_server.src.db.tables import Attestation, FSItem, VaultState


@encrypted_router.put(
    "/mutate",
    name="Mutate Merkle Tree",
    responses={
        status.HTTP_200_OK: {"description": "Mutation completed successfully"},
        status.HTTP_409_CONFLICT: {"description": "Mutation is invalid"},
    },
    response_model=Attestation,
)
def mutation_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    mutation: Annotated[Mutation, Body(description="Mutation to apply to the Merkle tree")],
):
    """
    Applies the provided mutation to the Merkle tree.

    If a conflict occurs, the client should refetch `/merkle/state` and `/merkle/dirty`, rebuild the
    mutation, and retry.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id

    # Get Merkle data
    vault_state = get_vault_state(root_id)
    need_updating_ids = get_unverified(root_id)
    need_content_mac_ids = get_missing_content_macs(root_id)
    latest_attestation = get_latest_attestation(root_id)

    # Ensure that the mutation is valid
    error = mutation_check(root_id, vault_state, mutation, need_updating_ids, latest_attestation, need_content_mac_ids)
    if error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error)

    new_attestation = Attestation.from_base(mutation.attestation, root_id)
    result = new_attestation.model_copy()
    with get_session() as session, session.begin():
        # Compare-and-swap the vault generation
        db_vault_state = session.get(VaultState, root_id)
        if db_vault_state is None or db_vault_state.current_generation != mutation.expected_generation:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Generation conflict")

        # Write node hashes and bump node versions
        for node_id, node_hash in mutation.node_hashes.items():
            node = session.get(FSItem, node_id)
            if node is None:
                # The node was removed between the check and the commit, so the mutation no longer covers the tree
                # Thus, the mutation is invalid
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Generation conflict")

            node.node_hash = node_hash
            node.version += 1
            session.add(node)

        # Write content MACs for the newly uploaded files
        for node_id, content_mac in mutation.content_macs.items():
            node = session.get(FSItem, node_id)
            if node is None:
                # See above
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Generation conflict")

            node.content_mac = content_mac
            session.add(node)

        # Add attestation
        session.add(new_attestation)

        # Update vault state
        # (The whole vault is clean now, so the counters are refreshed)
        item_count = count_items_with_root(root_id, session)
        db_vault_state.current_generation = new_attestation.generation
        db_vault_state.total_count = item_count
        db_vault_state.migrated_count = item_count
        session.add(db_vault_state)

    return result
