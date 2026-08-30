from base64 import b64encode
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.crypto.exef.exef import ExEF
from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.crypto.merkle.mutation import Mutation
from excalibur_server.src.crypto.merkle.structures import AttestationBase
from excalibur_server.src.db.operations import get_item, get_unverified, get_vault_state
from excalibur_server.src.db.operations.attestation import get_latest_attestation
from excalibur_server.src.db.tables import Attestation, FSItem, User, VaultState

MUTATION_USER = "mutation-user"


# Fixtures
@pytest.fixture(scope="session")
def mutation_user(db_session: Session):
    # Check if user already exists
    from excalibur_server.src.db.operations import get_user

    if existing_user := get_user(MUTATION_USER):
        return {"user": existing_user, "root_id": existing_user.fsitem_id}

    # Create user
    user = User(
        id=UUID("01234567-89ab-dcef-0123-456789ffffff"),
        username=MUTATION_USER,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        keygen_algorithm="Example Keygen Function",
        vault_info="Some Sample Info",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    root_folder = FSItem(name=str(user.id), parent_id=None, is_folder=True)
    root_folder.root_id = root_folder.id
    user.fsitem_id = root_folder.id

    # A dirty file, so that the mutation has to cover more than just the root
    file = FSItem(
        parent_id=root_folder.id,
        root_id=root_folder.id,
        name="mutation-file.exef",
        size=1234,
        content_mac=b"mutation-file-content-mac",
        node_hash=None,
    )

    root_attestation = Attestation(
        root_id=root_folder.id,
        generation=1,
        root_hash=b"test_root_hash",
        prev_root_hash=None,
        timestamp=1,
        tag=b"demo-tag",
    )
    vault_state = VaultState(
        root_id=root_folder.id,
        merkle_status=MerkleStatus.ACTIVE,
        current_generation=root_attestation.generation,
        migrated_count=5678,
        total_count=5678,
    )

    db_session.add(root_folder)
    db_session.add(file)
    db_session.add(user)
    db_session.add(root_attestation)
    db_session.add(vault_state)
    db_session.commit()

    return {"user": user, "root_id": root_folder.id, "file_id": file.id}


@pytest.fixture(scope="class")
def mutation_client(mutation_user) -> TestClient:
    """
    An authenticated client for testing.
    """

    MASTER_KEYS_CACHE["mutation-uuid"] = b"one demo 16B key"
    token = generate_auth_token(str(mutation_user["user"].id), "mutation-uuid", datetime.now(tz=UTC).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


# Helper functions
def _create_mutation(mutation_user, new_root_hash: bytes, other_node_hashes: dict[UUID, bytes]) -> Mutation:
    """
    Creates a mutation that chains onto the user's latest attestation.
    """

    prev_attestation = get_latest_attestation(mutation_user["root_id"])
    attestation = AttestationBase(
        generation=prev_attestation.generation + 1,
        root_hash=b64encode(new_root_hash),
        prev_root_hash=b64encode(prev_attestation.root_hash),
        timestamp=prev_attestation.timestamp + 1,
        tag=b64encode(prev_attestation.tag),
    )

    return Mutation(
        expected_generation=prev_attestation.generation,
        node_hashes={id: b64encode(hash) for id, hash in other_node_hashes.items()}
        | {mutation_user["root_id"]: b64encode(new_root_hash)},
        attestation=attestation,
    )


def _decrypt(response) -> bytes:
    return ExEF(b"one demo 16B key").decrypt(response.content)


# Test class
class TestMutate:
    def test_no_auth(self):
        response = TestClient(app).put("/api/merkle/mutate", json={"ids": ["sample"]})
        assert response.status_code == 401

    def test_reject_wrong_generation(self, mutation_user, mutation_client: TestClient):
        mutation = _create_mutation(mutation_user, b"new-root-hash", {mutation_user["file_id"]: b"new-file-hash"})
        mutation.expected_generation += 1

        response = mutation_client.put("/api/merkle/mutate", json=mutation.model_dump(mode="json"))
        assert response.status_code == 409, _decrypt(response)
        assert b"generation" in _decrypt(response)

    def test_reject_non_chaining_attestation(self, mutation_user, mutation_client: TestClient):
        mutation = _create_mutation(mutation_user, b"new-root-hash", {mutation_user["file_id"]: b"new-file-hash"})
        mutation.attestation.prev_root_hash = b"not-the-current-head"

        response = mutation_client.put("/api/merkle/mutate", json=mutation.model_dump(mode="json"))
        assert response.status_code == 409, _decrypt(response)
        assert b"chain" in _decrypt(response)

    def test_reject_missing_hashes(self, mutation_user, mutation_client: TestClient):
        # The dirty file's hash is not included
        mutation = _create_mutation(mutation_user, b"new-root-hash", {})

        response = mutation_client.put("/api/merkle/mutate", json=mutation.model_dump(mode="json"))
        assert response.status_code == 409, _decrypt(response)
        assert b"Missing hashes" in _decrypt(response)

    def test_reject_extra_hashes(self, mutation_user, mutation_client: TestClient):
        mutation = _create_mutation(
            mutation_user,
            b"new-root-hash",
            {mutation_user["file_id"]: b"new-file-hash", uuid4(): b"not-a-dirty-node"},
        )

        response = mutation_client.put("/api/merkle/mutate", json=mutation.model_dump(mode="json"))
        assert response.status_code == 409, _decrypt(response)
        assert b"Extra hashes" in _decrypt(response)

    def test_mutation_ok(self, mutation_user, mutation_client: TestClient):
        root_id = mutation_user["root_id"]
        file_id = mutation_user["file_id"]
        prev_attestation = get_latest_attestation(root_id)
        old_version = get_item(root_id).version

        mutation = _create_mutation(mutation_user, b"new-root-hash", {file_id: b"new-file-hash"})
        response = mutation_client.put("/api/merkle/mutate", json=mutation.model_dump(mode="json"))
        assert response.status_code == 200, _decrypt(response)

        # The hashes must be stored as the raw bytes that were attested, not as their Base64 form
        new_attestation = get_latest_attestation(root_id)
        assert new_attestation.generation == prev_attestation.generation + 1
        assert new_attestation.root_hash == b"new-root-hash"
        assert new_attestation.prev_root_hash == prev_attestation.root_hash
        assert new_attestation.root_id == root_id

        root = get_item(root_id)
        assert root.node_hash == b"new-root-hash"
        assert root.version == old_version + 1
        assert get_item(file_id).node_hash == b"new-file-hash"

        # The vault is now clean and on the new generation
        assert get_vault_state(root_id).current_generation == new_attestation.generation
        assert get_unverified(root_id) == set()
