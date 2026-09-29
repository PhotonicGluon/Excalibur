from typing import Annotated

from fastapi import Depends

from excalibur_server.api.routes.merkle import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_user_from_id, get_vault_state
from excalibur_server.src.db.tables import VaultState


@encrypted_router.get("/state", name="Get Vault State", response_model=VaultState)
def get_vault_state_endpoint(credentials: Annotated[Credentials, Depends(get_credentials)]):
    """
    Gets the vault state for the authenticated user.
    """

    user = get_user_from_id(credentials.user_id)
    root_id = user.fsitem_id
    return get_vault_state(root_id)
