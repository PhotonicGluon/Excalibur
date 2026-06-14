from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF


class TestGetUserInfo:
    def test_no_auth(self):
        response = TestClient(app).get("/api/users/info/get")
        assert response.status_code == 401

    def test_get_info(self, auth_client: TestClient):
        response = auth_client.get("/api/users/info/get")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"Some Sample Info"


class TestEditUserInfo:
    def test_no_auth(self):
        response = TestClient(app).post("/api/users/info/edit", json="New Info")
        assert response.status_code == 401

    def test_edit_info(self, auth_client: TestClient):
        response = auth_client.post("/api/users/info/edit", json="New Info")
        assert response.status_code == 200

        # Check that the info was updated
        response = auth_client.get("/api/users/info/get")
        assert response.status_code == 200
        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"New Info"

    def test_edit_info_transit_encryption(self, auth_client: TestClient):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }

        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(b"New Encrypted Data")
        response = auth_client.post(
            "/api/users/info/edit",
            headers=headers,
            content=transit_encrypted_data,
        )
        assert response.status_code == 200

        # Check that the info was updated
        response = auth_client.get("/api/users/info/get")
        assert response.status_code == 200
        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"New Encrypted Data"
