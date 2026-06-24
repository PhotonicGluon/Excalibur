from fastapi.testclient import TestClient

from excalibur_server.api.app import app


class TestGetUserAuthInfo:
    def test_get_user_auth_info(self, test_user):
        response = TestClient(app).get(f"/api/auth/info/{test_user['user'].username}")
        assert response.status_code == 200

        response = response.json()
        assert "auth_protocol" in response

    def test_get_non_existent_user_auth_info(self):
        response = TestClient(app).get("/api/auth/info/fake-user")
        assert response.status_code == 200

        response = response.json()
        assert "auth_protocol" in response
