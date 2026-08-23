from typing import Annotated

from fastapi import Body, Depends, HTTPException, status

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.merkle.mutation import Mutation, mutation_check
from excalibur_server.src.db.operations import (
    get_latest_attestation,
    get_session,
    get_unverified,
    get_user_from_id,
    get_vault_state,
)
from excalibur_server.src.db.tables import FSItem, VaultState


@encrypted_router.put(
    "/mutate",
    name="Mutate Merkle Tree",
    responses={
        status.HTTP_200_OK: {"description": "Mutation completed successfully"},
        status.HTTP_409_CONFLICT: {"description": "Mutation is invalid"},
    },
)
def mutation_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    mutation: Annotated[Mutation, Body(description="Mutation to apply to the Merkle tree")],
):
    """
    Applies the provided mutation to the Merkle tree.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id

    # Get Merkle data
    vault_state = get_vault_state(root_id)
    need_updating_ids = get_unverified(root_id)
    latest_attestation = get_latest_attestation(root_id)

    # Ensure that the mutation is valid
    error = mutation_check(root_id, vault_state, mutation, need_updating_ids, latest_attestation)
    if error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error)

    new_attestation = mutation.attestation
    with get_session() as session, session.begin():
        # Write node hashes and bump node versions
        for node_id, node_hash in mutation.node_hashes.items():
            node = session.get(FSItem, node_id)
            if node is None:
                continue

            node.node_hash = node_hash
            node.version += 1
            session.add(node)

        # Add attestation
        session.add(new_attestation)

        # Update vault state
        vault_state = session.get(VaultState, root_id)
        vault_state.current_generation = new_attestation.generation
        session.add(vault_state)
