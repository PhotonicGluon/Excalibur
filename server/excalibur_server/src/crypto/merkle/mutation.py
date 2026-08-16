from uuid import UUID

from pydantic import Base64Bytes, BaseModel

from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.db.tables import Attestation, VaultState


class Mutation(BaseModel):
    """
    A mutation to apply to a Merkle tree.
    """

    expected_generation: int
    "Expected generation of the Merkle tree _before_ the mutation."
    node_hashes: dict[UUID, Base64Bytes]
    """
    Mapping of every node that will be modified to its new hash value.

    This includes every ancestor of the modified nodes.
    """
    attestation: Attestation
    "New attestation for the Merkle tree."


def mutation_check(
    root_id: UUID,
    vault_state: VaultState,
    mutation: Mutation,
    need_updating_ids: set[UUID],
    previous_attestation: Attestation | None,
) -> str | None:
    """
    Check if a mutation is valid.

    :returns: None if the mutation is valid, otherwise a string describing the error
    """

    if vault_state.merkle_status == MerkleStatus.MIGRATING:
        return "Vault is upgrading; cannot mutate"

    # Attestation structural checks
    attestation = mutation.attestation
    if attestation.generation != mutation.expected_generation + 1:
        return "Attestation's generation must be exactly one greater than the expected generation"
    if attestation.root_hash != mutation.node_hashes.get(root_id):
        return "Attestation's root hash does not match submitted root node's hash"
    if previous_attestation is not None and attestation.prev_root_hash != previous_attestation.root_hash:
        return "Attestation does not chain to current head"

    # Ensure that only required hashes are provided
    node_ids = mutation.node_hashes.keys()
    missing = need_updating_ids - node_ids
    extra = node_ids - need_updating_ids
    if missing:
        return f"Missing hashes for nodes: {missing}"
    if extra:
        return f"Extra hashes provided for nodes: {extra}"

    return None
