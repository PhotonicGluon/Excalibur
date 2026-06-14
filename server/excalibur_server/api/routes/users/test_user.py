from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF

client = TestClient(app)


def test_get_user_security_details(auth_client: TestClient):
    response = client.get("/api/users/security/test-user")
    assert response.status_code == 200
    data = response.json()
    assert "auk_salt" in data
    assert "auth_protocol" in data


def test_get_user_vault_key(auth_client: TestClient):
    # Without authentication, it should fail
    response = client.get("/api/users/vault/test-user")
    assert response.status_code == 401

    # With authentication, it should succeed
    response = auth_client.get("/api/users/vault/test-user")
    assert response.status_code == 200
    assert ExEF.validate(response.content), "Did not return an encrypted response"
