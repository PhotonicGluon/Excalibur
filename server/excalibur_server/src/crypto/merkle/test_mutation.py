from uuid import UUID

from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.merkle.mutation import Mutation, mutation_check
from excalibur_server.src.db.tables import Attestation, VaultState

ROOT_ID = UUID("00000000-0000-0000-0000-000000000000")
VAULT_STATE = VaultState(
    root_id=ROOT_ID, merkle_status=MerkleStatus.ACTIVE, current_generation=1234, migrated_count=5678, total_count=5678
)

PREV_ATTESTATION = Attestation(
    root_id=ROOT_ID,
    generation=1234,
    root_hash=b"root-hash",
    prev_root_hash=b"prev-root-hash",
    timestamp=123456789,
    tag=b"attestation-tag",
)
NEW_ATTESTATION = Attestation(
    root_id=ROOT_ID,
    generation=1235,
    root_hash=b"new-root-hash",
    prev_root_hash=b"root-hash",
    timestamp=123456789,
    tag=b"attestation-tag",
)
MUTATION = Mutation(
    expected_generation=1234,
    node_hashes={
        ROOT_ID: b"bmV3LXJvb3QtaGFzaA=="  # Base64 of "new-root-hash"
    },
    attestation=NEW_ATTESTATION.model_copy(),
)


class TestMutationCheck:
    def test_reject_if_migrating(self):
        vault_state = VAULT_STATE.model_copy()
        vault_state.merkle_status = MerkleStatus.MIGRATING
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=vault_state,
                mutation=MUTATION,
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Vault is upgrading; cannot mutate"
        )

    def test_reject_if_attestation_generation_incorrect(self):
        mutation = MUTATION.model_copy()
        mutation.attestation = mutation.attestation.model_copy(update={"generation": 0})
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=mutation,
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation's generation must be exactly one greater than the expected generation"
        )

    def test_reject_incorrect_root_hash(self):
        mutation = MUTATION.model_copy()
        mutation.node_hashes = {ROOT_ID: b"wrong-root-hash"}
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=mutation,
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation's root hash does not match submitted root node's hash"
        )

    def test_reject_non_chaining_attestation(self):
        mutation = MUTATION.model_copy()
        mutation.attestation = mutation.attestation.model_copy(update={"prev_root_hash": b"wrong-prev-root-hash"})
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=mutation,
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation does not chain to current head"
        )

    def test_reject_missing_hashes(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=MUTATION,
            need_updating_ids={ROOT_ID, UUID("10000000-0000-0000-0000-000000000000")},
            previous_attestation=PREV_ATTESTATION,
        ).startswith("Missing hashes")

    def test_reject_extra_hashes(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=MUTATION,
            need_updating_ids=set(),
            previous_attestation=PREV_ATTESTATION,
        ).startswith("Extra hashes")

    def test_accept_ok_mutation(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=MUTATION,
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            is None
        )
