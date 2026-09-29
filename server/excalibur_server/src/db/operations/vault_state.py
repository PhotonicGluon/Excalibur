from uuid import UUID

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import VaultState


def get_vault_state(root_id: UUID) -> VaultState:
    """
    Gets the vault state for a root ID.

    :param root_id: the root ID to check
    :return: the vault state, or the default non-migrated vault state if none exists
    """

    with get_session() as session:
        vault_state = session.get(VaultState, root_id)
        if vault_state is None:
            # Return the default non-migrated vault state
            vault_state = VaultState(root_id=root_id)
        else:
            vault_state = vault_state.model_copy()
        return vault_state
