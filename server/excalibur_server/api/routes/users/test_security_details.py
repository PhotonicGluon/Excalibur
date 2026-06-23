from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


class TestGetUserSecurityDetails:
    def test_get_user_security_details(self):
        response = client.get("/api/users/security/test-user")
        assert response.status_code == 200
        data = response.json()
        assert "auk_salt" in data
        assert "keygen_function" in data
        assert "auth_protocol" in data
