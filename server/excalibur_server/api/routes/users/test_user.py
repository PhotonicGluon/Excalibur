from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


def test_check_user():
    # Test that the user exists
    response = client.head("/api/users/check/test-user")
    assert response.status_code == 200

    # Non-existent user should be 404
    response = client.head("/api/users/check/does-not-exist")
    assert response.status_code == 404


def test_get_user_security_details():
    response = client.get("/api/users/security/test-user")
    assert response.status_code == 200
    data = response.json()
    assert "auk_salt" in data
    assert "auth_protocol" in data
    assert "srp_salt" in data


def test_get_user_vault_key(auth_client: TestClient):
    # Without authentication, it should fail
    response = client.get("/api/users/vault/test-user")
    assert response.status_code == 401

    # With authentication, it should succeed
    response = auth_client.get("/api/users/vault/test-user")
    assert response.status_code == 200
