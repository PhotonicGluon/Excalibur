from uuid import UUID

from pydantic import Base64Bytes, BaseModel

from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.merkle.structures import AttestationBase
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
    content_macs: dict[UUID, Base64Bytes] = {}
    """
    Mapping of every file that is missing a content MAC to its new content MAC.

    Only files may appear here, and only those that do not already have a content MAC stored on the
    server (i.e., newly uploaded files).
    """
    attestation: AttestationBase
    "New attestation for the Merkle tree."


def _check_vault_state(vault_state: VaultState, mutation: Mutation) -> str | None:
    """
    Checks a mutation against the vault's current state.

    :returns: None if the vault can accept the mutation, otherwise a string describing the error
    """

    if vault_state.merkle_status == MerkleStatus.MIGRATING:
        return "Vault is upgrading; cannot mutate"
    if vault_state.merkle_status == MerkleStatus.NONE:
        return "Vault has no Merkle tree; migrate the vault before mutating"
    if mutation.expected_generation != vault_state.current_generation:
        return (
            f"Expected generation {mutation.expected_generation} does not match the vault's current "
            f"generation {vault_state.current_generation}"
        )

    return None


def _check_attestation(root_id: UUID, mutation: Mutation, previous_attestation: Attestation | None) -> str | None:
    """
    Checks a mutation's attestation for structural validity.

    :returns: None if the attestation is valid, otherwise a string describing the error
    """

    attestation = mutation.attestation
    if attestation.generation != mutation.expected_generation + 1:
        return "Attestation's generation must be exactly one greater than the expected generation"
    if attestation.root_hash != mutation.node_hashes.get(root_id):
        return "Attestation's root hash does not match submitted root node's hash"
    if previous_attestation is not None and attestation.prev_root_hash != previous_attestation.root_hash:
        return "Attestation does not chain to current head"

    return None


def _check_exact_coverage(provided_ids: set[UUID], needed_ids: set[UUID], what: str) -> str | None:
    """
    Checks that the provided IDs are exactly the IDs that are needed.

    Requiring exactness is also what stops a client from writing values into another user's items,
    since the needed IDs are always computed server-side from the user's own root.

    :param provided_ids: the IDs that the client submitted
    :param needed_ids: the IDs that the server requires
    :param what: what is being submitted, used in the error message
    :returns: None if the IDs match exactly, otherwise a string describing the error
    """

    missing = needed_ids - provided_ids
    if missing:
        return f"Missing {what} for nodes: {missing}"

    extra = provided_ids - needed_ids
    if extra:
        return f"Extra {what} provided for nodes: {extra}"

    return None


def mutation_check(
    root_id: UUID,
    vault_state: VaultState,
    mutation: Mutation,
    need_updating_ids: set[UUID],
    previous_attestation: Attestation | None,
    need_content_mac_ids: set[UUID] | None = None,
) -> str | None:
    """
    Check if a mutation is valid.

    :param root_id: ID of the root of the tree being mutated
    :param vault_state: current state of the vault
    :param mutation: the mutation to check
    :param need_updating_ids: IDs of every node that currently lacks a valid `node_hash`
    :param previous_attestation: the current head of the attestation chain, or None if there is none
    :param need_content_mac_ids: IDs of every file that currently lacks a `content_mac`, or None if
        no file needs one
    :returns: None if the mutation is valid, otherwise a string describing the error
    """

    if need_content_mac_ids is None:
        need_content_mac_ids = set()

    return (
        _check_vault_state(vault_state, mutation)
        or _check_attestation(root_id, mutation, previous_attestation)
        or _check_exact_coverage(set(mutation.node_hashes.keys()), need_updating_ids, "hashes")
        or _check_exact_coverage(set(mutation.content_macs.keys()), need_content_mac_ids, "content MACs")
    )
