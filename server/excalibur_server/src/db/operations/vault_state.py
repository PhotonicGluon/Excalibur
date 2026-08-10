from uuid import UUID

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import VaultState


def update_vault_state_generation(root_id: UUID, new_generation: int):
    """
    Updates the generation of a vault state.

    :param root_id: the root ID of the vault state to update
    :param new_generation: the new generation to set
    :raises ValueError: if a generation conflict is detected
    """

    with get_session() as session, session.begin():
        vault_states = (
            session.query(VaultState)
            .filter(VaultState.root_id == root_id, VaultState.current_generation == new_generation - 1)
            .all()
        )
        if len(vault_states) != 1:
            raise ValueError("Generation conflict")
        vault_state = vault_states[0]

        vault_state.current_generation = new_generation
        session.add(vault_state)
