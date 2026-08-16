from typing import Annotated

from fastapi import Body, Depends, HTTPException, status

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.crypto.merkle.mutation import Mutation, mutation_check
from excalibur_server.src.db.operations import (
    get_latest_attestation,
    get_unverified,
    get_user_from_id,
    get_vault_state,
)


@encrypted_router.put("/mutate", name="Mutate Merkle Tree")
def mutation_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    mutation: Annotated[Mutation, Body(description="Mutation to apply to the Merkle tree")],
):
    """
    Applies the provided mutation to the Merkle tree.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id

    vault_state = get_vault_state(root_id)
    need_updating_ids = get_unverified(root_id)
    latest_attestation = get_latest_attestation(root_id)

    error = mutation_check(root_id, vault_state, mutation, need_updating_ids, latest_attestation)
    if error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error)

    # TODO: Add
    return "Blah"
