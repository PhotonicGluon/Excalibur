from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_items_in_root
from excalibur_server.src.exef import ExEF


class TestCount:
    def test_no_auth(self):
        response = TestClient(app).get("/api/files/count")
        assert response.status_code == 401

    def test_count_all(self, auth_client: TestClient, test_user):
        response = auth_client.get("/api/files/count")
        assert response.status_code == 200

        content = ExEF(b"one demo 16B key").decrypt(response.content)
        count = int(content)
        assert count == len(
            get_items_in_root(test_user["root_id"])  # Should match the number of items in the root
        )
