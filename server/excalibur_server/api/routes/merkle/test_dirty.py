import json

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_unverified, has_unverified


class TestHasDirty:
    def test_no_auth(self):
        response = TestClient(app).head("/api/merkle/dirty")
        assert response.status_code == 401

    def test_head(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        response = auth_client.head("/api/merkle/dirty")
        assert (response.status_code == 200) == has_unverified(root_id)


class TestGetDirty:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/dirty")
        assert response.status_code == 401

    def test_get(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        response = auth_client.get("/api/merkle/dirty")
        assert response.status_code == 200

        gotten_dirty = set(json.loads(ExEF(b"one demo 16B key").decrypt(response.content)))
        expected_dirty = {str(u) for u in get_unverified(root_id)}
        assert gotten_dirty == expected_dirty
