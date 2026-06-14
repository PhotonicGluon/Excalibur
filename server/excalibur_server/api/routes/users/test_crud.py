from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


class TestCheckUser:
    def test_check_user(self):
        response = client.head("/api/users/check/test-user")
        assert response.status_code == 200

    def test_non_existent_user(self):
        response = client.head("/api/users/check/does-not-exist")
        assert response.status_code == 404
