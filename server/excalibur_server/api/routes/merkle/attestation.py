from typing import Annotated

from fastapi import Depends

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_latest_attestation, get_user_from_id
from excalibur_server.src.db.tables import RootAttestation


@encrypted_router.get("/attestation", name="Get Latest Attestation", response_model=RootAttestation)
def get_attestation_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return get_latest_attestation(root_id)
