from typing import Annotated

from fastapi import Depends, Query

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_latest_attestation, get_user_from_id
from excalibur_server.src.db.operations.root_attestation import get_attestations
from excalibur_server.src.db.tables import RootAttestation


@encrypted_router.get("/attestation", name="Get Latest Attestation", response_model=RootAttestation | None)
def get_latest_attestation_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Gets the latest attestation for the authenticated user.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return get_latest_attestation(root_id)


@encrypted_router.get("/attestations", name="Get Attestation Chain", response_model=list[RootAttestation])
def get_all_attestations_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    from_gen: Annotated[
        int | None,
        Query(description="The starting attestation generation, or the earliest possible generation if omitted."),
    ] = None,
    to_gen: Annotated[
        int | None,
        Query(description="The ending attestation generation, or latest possible generation if omitted."),
    ] = None,
):
    """
    Gets the attestation chain for the authenticated user.

    The attestation chain generation range is inclusive of both endpoints.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return get_attestations(root_id, from_gen=from_gen, to_gen=to_gen)
