import json
from base64 import b64encode
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.db.operations import (
    get_item,
    get_latest_attestation,
    get_session,
    get_unverified,
    get_vault_state,
)
from excalibur_server.src.db.tables import Attestation, FSItem, User, VaultState

MIGRATION_USER = "migration-user"


# Fixtures
@pytest.fixture(scope="function")
def migration_user(db_session: Session):
    from excalibur_server.src.db.operations import get_user

    user = get_user(MIGRATION_USER)
    if user is None:
        user = User(
            id=UUID("01234567-89ab-dcef-0123-456789eeeeee"),
            username=MIGRATION_USER,
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            keygen_algorithm="Example Keygen Function",
            vault_info="Some Sample Info",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        root_folder = FSItem(name=str(user.id), parent_id=None, is_folder=True)
        root_folder.root_id = root_folder.id
        user.fsitem_id = root_folder.id

        db_session.add(root_folder)
        db_session.add(user)
        db_session.commit()

    root_id = user.fsitem_id

    # Reset the vault to its pre-migration state
    folder = FSItem(parent_id=root_id, root_id=root_id, name="a-folder", is_folder=True)
    file = FSItem(parent_id=folder.id, root_id=root_id, name="a-file.exef", size=1234)
    folder_id, file_id = folder.id, file.id

    with get_session() as session, session.begin():
        for item in session.execute(select(FSItem).where(FSItem.root_id == root_id)).scalars().all():
            if item.id == root_id:
                item.node_hash = None
                item.content_mac = None
                item.version = 1
                session.add(item)
            else:
                session.delete(item)

        for vault_state in session.execute(select(VaultState).where(VaultState.root_id == root_id)).scalars().all():
            session.delete(vault_state)

        for attestation in session.execute(select(Attestation).where(Attestation.root_id == root_id)).scalars().all():
            session.delete(attestation)

    with get_session() as session, session.begin():
        session.add(folder)
        session.add(file)

    yield {"user": user, "root_id": root_id, "folder_id": folder_id, "file_id": file_id}


@pytest.fixture(scope="function")
def migration_client(migration_user) -> TestClient:
    MASTER_KEYS_CACHE["migration-uuid"] = b"one demo 16B key"
    token = generate_auth_token(
        str(migration_user["user"].id), "migration-uuid", datetime.now(tz=UTC).timestamp() + 9999
    )
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


# Helper functions
def _decrypt(response) -> bytes:
    return ExEF(b"one demo 16B key").decrypt(response.content)


def _load(response) -> dict:
    return json.loads(_decrypt(response))


def _fill_all_merkle_data(client: TestClient, migration_user) -> dict:
    entries = {}
    for item_id in get_unverified(migration_user["root_id"]):
        item = get_item(item_id)
        entries[str(item_id)] = {
            "node_hash": b64encode(b"hash-" + item.name.encode()).decode(),
            "content_mac": None if item.is_folder else b64encode(b"mac-" + item.name.encode()).decode(),
        }

    return _load(client.post("/api/merkle/migrate/fill", json=entries))


def _completion_attestation(migration_user, *, generation: int = 1, prev_root_hash: str | None = None) -> dict:
    root = get_item(migration_user["root_id"])
    return {
        "generation": generation,
        "root_hash": b64encode(root.node_hash).decode(),
        "prev_root_hash": prev_root_hash,
        "timestamp": 123456789,
        "tag": b64encode(b"migration-tag").decode(),
    }


# Test classes
class TestBeginMigration:
    def test_no_auth(self):
        assert TestClient(app).post("/api/merkle/migrate").status_code == 401

    def test_begin(self, migration_user, migration_client: TestClient):
        response = migration_client.post("/api/merkle/migrate")
        assert response.status_code == 200, _decrypt(response)

        vault_state = _load(response)
        assert vault_state["merkle_status"] == "migrating"
        assert vault_state["current_generation"] == 0
        assert vault_state["migrated_count"] == 0
        assert vault_state["total_count"] == 3  # Root, folder, and file

        assert get_vault_state(migration_user["root_id"]).merkle_status == MerkleStatus.MIGRATING

    def test_reject_if_already_migrating(self, migration_client: TestClient):
        assert migration_client.post("/api/merkle/migrate").status_code == 200

        response = migration_client.post("/api/merkle/migrate")
        assert response.status_code == 409
        assert b"migrating" in _decrypt(response)

    def test_reject_if_already_active(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)
        migration_client.post("/api/merkle/migrate/complete", json=_completion_attestation(migration_user))

        response = migration_client.post("/api/merkle/migrate")
        assert response.status_code == 409
        assert b"active" in _decrypt(response)


class TestFillMigration:
    def test_no_auth(self):
        assert TestClient(app).post("/api/merkle/migrate/fill", json={}).status_code == 401

    def test_reject_if_not_migrating(self, migration_client: TestClient):
        response = migration_client.post("/api/merkle/migrate/fill", json={})
        assert response.status_code == 409
        assert b"not migrating" in _decrypt(response)

    def test_fill(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        folder_id = migration_user["folder_id"]
        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={str(folder_id): {"node_hash": b64encode(b"folder-hash").decode(), "content_mac": None}},
        )
        assert response.status_code == 200, _decrypt(response)

        vault_state = _load(response)
        assert vault_state["migrated_count"] == 1
        assert vault_state["total_count"] == 3

        assert get_item(folder_id).node_hash == b"folder-hash"

    def test_fill_is_resumable(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        # Fill everything one chunk at a time
        for item_id in sorted(get_unverified(migration_user["root_id"])):
            item = get_item(item_id)
            entry = {
                "node_hash": b64encode(b"hash-1").decode(),
                "content_mac": None if item.is_folder else b64encode(b"mac-1").decode(),
            }
            response = migration_client.post("/api/merkle/migrate/fill", json={str(item_id): entry})
            assert response.status_code == 200, _decrypt(response)

        assert get_unverified(migration_user["root_id"]) == set()
        assert _load(migration_client.post("/api/merkle/migrate/fill", json={}))["migrated_count"] == 3

        # Re-submitting a chunk simply overwrites what was stored
        file_id = migration_user["file_id"]
        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={
                str(file_id): {
                    "node_hash": b64encode(b"hash-2").decode(),
                    "content_mac": b64encode(b"mac-2").decode(),
                }
            },
        )
        assert response.status_code == 200, _decrypt(response)
        assert get_item(file_id).node_hash == b"hash-2"

    def test_reject_foreign_item(self, test_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={str(test_user["root_id"]): {"node_hash": b64encode(b"nope").decode(), "content_mac": None}},
        )
        assert response.status_code == 409
        assert b"not in this vault" in _decrypt(response)

    def test_reject_unknown_item(self, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={str(uuid4()): {"node_hash": b64encode(b"nope").decode(), "content_mac": None}},
        )
        assert response.status_code == 409
        assert b"not in this vault" in _decrypt(response)

    def test_reject_content_mac_on_folder(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={
                str(migration_user["folder_id"]): {
                    "node_hash": b64encode(b"folder-hash").decode(),
                    "content_mac": b64encode(b"should-not-be-here").decode(),
                }
            },
        )
        assert response.status_code == 409
        assert b"folder" in _decrypt(response)

    def test_reject_file_without_content_mac(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")

        response = migration_client.post(
            "/api/merkle/migrate/fill",
            json={str(migration_user["file_id"]): {"node_hash": b64encode(b"file-hash").decode(), "content_mac": None}},
        )
        assert response.status_code == 409
        assert b"needs a content MAC" in _decrypt(response)


class TestCompleteMigration:
    def test_no_auth(self):
        assert TestClient(app).post("/api/merkle/migrate/complete", json={}).status_code == 401

    def test_reject_if_not_migrating(self, migration_user, migration_client: TestClient):
        response = migration_client.post(
            "/api/merkle/migrate/complete",
            json={
                "generation": 1,
                "root_hash": b64encode(b"root-hash").decode(),
                "prev_root_hash": None,
                "timestamp": 1,
                "tag": b64encode(b"tag").decode(),
            },
        )
        assert response.status_code == 409
        assert b"not migrating" in _decrypt(response)

    def test_reject_incomplete_migration(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")
        migration_client.post(
            "/api/merkle/migrate/fill",
            json={str(migration_user["root_id"]): {"node_hash": b64encode(b"root-hash").decode(), "content_mac": None}},
        )

        response = migration_client.post("/api/merkle/migrate/complete", json=_completion_attestation(migration_user))
        assert response.status_code == 409
        assert b"incomplete" in _decrypt(response)

    def test_reject_wrong_generation(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)

        response = migration_client.post(
            "/api/merkle/migrate/complete", json=_completion_attestation(migration_user, generation=2)
        )
        assert response.status_code == 409
        assert b"generation 1" in _decrypt(response)

    def test_reject_chaining_attestation(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)

        response = migration_client.post(
            "/api/merkle/migrate/complete",
            json=_completion_attestation(migration_user, prev_root_hash=b64encode(b"previous").decode()),
        )
        assert response.status_code == 409
        assert b"chain" in _decrypt(response)

    def test_reject_mismatched_root_hash(self, migration_user, migration_client: TestClient):
        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)

        attestation = _completion_attestation(migration_user)
        attestation["root_hash"] = b64encode(b"not-the-root-hash").decode()

        response = migration_client.post("/api/merkle/migrate/complete", json=attestation)
        assert response.status_code == 409
        assert b"root hash" in _decrypt(response)

    def test_complete(self, migration_user, migration_client: TestClient):
        root_id = migration_user["root_id"]

        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)

        response = migration_client.post("/api/merkle/migrate/complete", json=_completion_attestation(migration_user))
        assert response.status_code == 200, _decrypt(response)

        attestation = _load(response)
        assert attestation["generation"] == 1
        assert attestation["prev_root_hash"] is None

        # The attestation is stored as the raw bytes that were attested
        stored = get_latest_attestation(root_id)
        assert stored.generation == 1
        assert stored.root_hash == get_item(root_id).node_hash

        vault_state = get_vault_state(root_id)
        assert vault_state.merkle_status == MerkleStatus.ACTIVE
        assert vault_state.current_generation == 1
        assert vault_state.migrated_count == vault_state.total_count == 3

    def test_writes_during_migration_are_folded_in(self, migration_user, migration_client: TestClient, db_session):
        root_id = migration_user["root_id"]

        migration_client.post("/api/merkle/migrate")
        _fill_all_merkle_data(migration_client, migration_user)

        # Another device writes a file
        newcomer = FSItem(parent_id=root_id, root_id=root_id, name="late-arrival.exef", size=1)
        db_session.add(newcomer)
        db_session.commit()

        response = migration_client.post("/api/merkle/migrate/complete", json=_completion_attestation(migration_user))
        assert response.status_code == 409
        assert b"incomplete" in _decrypt(response)

        # Once it is filled in, the migration can complete
        _fill_all_merkle_data(migration_client, migration_user)
        response = migration_client.post("/api/merkle/migrate/complete", json=_completion_attestation(migration_user))
        assert response.status_code == 200, _decrypt(response)
        assert get_vault_state(root_id).total_count == 4
