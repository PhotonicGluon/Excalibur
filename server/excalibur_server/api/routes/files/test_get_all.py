import json

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_items_in_root
from excalibur_server.src.exef import ExEF


class TestGetAll:
    def test_no_auth(self):
        response = TestClient(app).get("/api/files/all")
        assert response.status_code == 401

    def test_get_all(self, auth_client_db: TestClient, test_user):
        response = auth_client_db.get("/api/files/all")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        content = ExEF(b"one demo 16B key").decrypt(response.content)
        files = json.loads(content)
        assert len(files) == len(
            get_items_in_root(test_user["root_id"])  # Should match the number of items in the root
        )
