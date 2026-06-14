from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF

client = TestClient(app)


class TestGetUserVaultKey:
    def test_no_auth(self):
        response = client.get("/api/users/vault/test-user")
        assert response.status_code == 401

    def test_get_user_vault_key(self, auth_client: TestClient):
        response = auth_client.get("/api/users/vault/test-user")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"
