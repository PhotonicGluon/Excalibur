from base64 import b64encode
from uuid import UUID

from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.merkle.mutation import Mutation, mutation_check
from excalibur_server.src.crypto.merkle.structures import AttestationBase
from excalibur_server.src.db.tables import Attestation, VaultState

ROOT_ID = UUID("00000000-0000-0000-0000-000000000000")
OTHER_ID = UUID("10000000-0000-0000-0000-000000000000")

VAULT_STATE = VaultState(
    root_id=ROOT_ID, merkle_status=MerkleStatus.ACTIVE, current_generation=1234, migrated_count=5678, total_count=5678
)

# Table models are not validated, so the stored attestation's hashes are plain bytes
PREV_ATTESTATION = Attestation(
    root_id=ROOT_ID,
    generation=1234,
    root_hash=b"root-hash",
    prev_root_hash=b"prev-root-hash",
    timestamp=123456789,
    tag=b"attestation-tag",
)


def _make_mutation(
    *,
    node_hashes: dict[UUID, bytes] | None = None,
    content_macs: dict[UUID, bytes] | None = None,
    expected_generation: int = 1234,
    generation: int = 1235,
    root_hash: bytes = b"new-root-hash",
    prev_root_hash: bytes = b"root-hash",
) -> Mutation:
    """
    Creates a mutation, which by default is a valid one for `VAULT_STATE` and `PREV_ATTESTATION`.

    Hashes are given as plain bytes; they are Base64 encoded here since that is how they arrive over
    the wire (and hence how the models expect them).
    """

    if node_hashes is None:
        node_hashes = {ROOT_ID: root_hash}
    if content_macs is None:
        content_macs = {}

    return Mutation(
        expected_generation=expected_generation,
        node_hashes={id: b64encode(hash) for id, hash in node_hashes.items()},
        content_macs={id: b64encode(mac) for id, mac in content_macs.items()},
        attestation=AttestationBase(
            generation=generation,
            root_hash=b64encode(root_hash),
            prev_root_hash=b64encode(prev_root_hash),
            timestamp=123456789,
            tag=b64encode(b"attestation-tag"),
        ),
    )


class TestMutationCheck:
    def test_reject_if_migrating(self):
        vault_state = VAULT_STATE.model_copy()
        vault_state.merkle_status = MerkleStatus.MIGRATING
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=vault_state,
                mutation=_make_mutation(),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Vault is upgrading; cannot mutate"
        )

    def test_reject_if_no_merkle_tree(self):
        vault_state = VAULT_STATE.model_copy()
        vault_state.merkle_status = MerkleStatus.NONE
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=vault_state,
                mutation=_make_mutation(),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Vault has no Merkle tree; migrate the vault before mutating"
        )

    def test_reject_if_expected_generation_is_stale(self):
        error = mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(expected_generation=1233, generation=1234),
            need_updating_ids={ROOT_ID},
            previous_attestation=PREV_ATTESTATION,
        )
        assert error == "Expected generation 1233 does not match the vault's current generation 1234"

    def test_reject_if_expected_generation_is_ahead(self):
        error = mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(expected_generation=1235, generation=1236),
            need_updating_ids={ROOT_ID},
            previous_attestation=PREV_ATTESTATION,
        )
        assert error == "Expected generation 1235 does not match the vault's current generation 1234"

    def test_reject_if_attestation_generation_incorrect(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(generation=0),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation's generation must be exactly one greater than the expected generation"
        )

    def test_reject_incorrect_root_hash(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(node_hashes={ROOT_ID: b"wrong-root-hash"}),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation's root hash does not match submitted root node's hash"
        )

    def test_reject_missing_root_hash(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(node_hashes={OTHER_ID: b"new-root-hash"}),
                need_updating_ids={ROOT_ID, OTHER_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation's root hash does not match submitted root node's hash"
        )

    def test_reject_non_chaining_attestation(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(prev_root_hash=b"wrong-prev-root-hash"),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            == "Attestation does not chain to current head"
        )

    def test_reject_missing_hashes(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(),
            need_updating_ids={ROOT_ID, OTHER_ID},
            previous_attestation=PREV_ATTESTATION,
        ).startswith("Missing hashes")

    def test_reject_extra_hashes(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(),
            need_updating_ids=set(),
            previous_attestation=PREV_ATTESTATION,
        ).startswith("Extra hashes")

    def test_reject_missing_content_macs(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(),
            need_updating_ids={ROOT_ID},
            previous_attestation=PREV_ATTESTATION,
            need_content_mac_ids={OTHER_ID},
        ).startswith("Missing content MACs")

    def test_reject_extra_content_macs(self):
        assert mutation_check(
            ROOT_ID,
            vault_state=VAULT_STATE,
            mutation=_make_mutation(content_macs={OTHER_ID: b"a-content-mac"}),
            need_updating_ids={ROOT_ID},
            previous_attestation=PREV_ATTESTATION,
        ).startswith("Extra content MACs")

    def test_accept_ok_content_macs(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(
                    node_hashes={ROOT_ID: b"new-root-hash", OTHER_ID: b"child-hash"},
                    content_macs={OTHER_ID: b"a-content-mac"},
                ),
                need_updating_ids={ROOT_ID, OTHER_ID},
                previous_attestation=PREV_ATTESTATION,
                need_content_mac_ids={OTHER_ID},
            )
            is None
        )

    def test_accept_ok_mutation(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(),
                need_updating_ids={ROOT_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            is None
        )

    def test_accept_ok_mutation_with_multiple_nodes(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(node_hashes={ROOT_ID: b"new-root-hash", OTHER_ID: b"child-hash"}),
                need_updating_ids={ROOT_ID, OTHER_ID},
                previous_attestation=PREV_ATTESTATION,
            )
            is None
        )

    def test_accept_first_generation(self):
        assert (
            mutation_check(
                ROOT_ID,
                vault_state=VAULT_STATE,
                mutation=_make_mutation(prev_root_hash=b"anything"),
                need_updating_ids={ROOT_ID},
                previous_attestation=None,
            )
            is None
        )
