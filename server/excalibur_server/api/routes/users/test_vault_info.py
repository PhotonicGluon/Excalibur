import json

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF


class TestGetUserVaultInfo:
    def test_no_auth(self):
        response = TestClient(app).get("/api/users/vault")
        assert response.status_code == 401

    def test_get_user_vault_info(self, auth_client: TestClient):
        response = auth_client.get("/api/users/vault")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert response["keygen_algorithm"] == "Example Keygen Function"
        assert "auk_salt" in response
        assert "key_enc" in response
        assert response["vault_info"] == "Some Sample Info"


class TestEditUserVaultInfo:
    DATA = {"keygen_algorithm": "New Keygen Function", "vault_info": "New Info"}

    def test_no_auth(self):
        response = TestClient(app).put(
            "/api/users/vault",
            json=self.DATA,
        )
        assert response.status_code == 401

    def test_edit_info(self, auth_client: TestClient):
        response = auth_client.put(
            "/api/users/vault",
            json=self.DATA,
        )
        assert response.status_code == 200

        # Check that the info was updated
        response = auth_client.get("/api/users/vault")
        assert response.status_code == 200
        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert response["vault_info"] == self.DATA["vault_info"]
        assert response["keygen_algorithm"] == self.DATA["keygen_algorithm"]

    def test_edit_info_transit_encryption(self, auth_client: TestClient):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }

        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(json.dumps(self.DATA).encode())
        response = auth_client.put(
            "/api/users/vault",
            headers=headers,
            content=transit_encrypted_data,
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        # Check that the info was updated
        response = auth_client.get("/api/users/vault")
        assert response.status_code == 200
        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert response["vault_info"] == self.DATA["vault_info"]
        assert response["keygen_algorithm"] == self.DATA["keygen_algorithm"]
