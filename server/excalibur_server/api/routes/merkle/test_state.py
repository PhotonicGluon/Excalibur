import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.crypto.merkle.enums import MerkleStatus
from excalibur_server.src.db.tables import VaultState


@pytest.fixture
def vault_state(test_user, db_session: Session) -> VaultState:
    root_id = test_user["root_id"]

    vault_state = VaultState(
        root_id=root_id,
        merkle_status=MerkleStatus.ACTIVE,
        current_generation=1,
        migrated_count=-1337,
        total_count=-1337,
    )

    vault_state_copy = vault_state.model_copy()
    db_session.add(vault_state)
    db_session.commit()
    yield vault_state_copy

    db_session.delete(vault_state_copy)
    db_session.commit()


class TestGetVaultState:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/state")
        assert response.status_code == 401

    def test_get(self, auth_client: TestClient, vault_state):
        response = auth_client.get("/api/merkle/state")
        assert response.status_code == 200

        gotten_vault_state = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert gotten_vault_state == vault_state.model_dump()

    def test_get_for_user_without_vault_state(self, auth_client: TestClient):
        response = auth_client.get("/api/merkle/state")
        assert response.status_code == 200

        vault_state = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert vault_state["merkle_status"] == "none"
