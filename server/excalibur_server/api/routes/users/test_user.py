from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF

client = TestClient(app)


def test_check_user(auth_client: TestClient):
    # Test that the user exists
    response = client.head("/api/users/check/test-user")
    assert response.status_code == 200

    # Non-existent user should be 404
    response = client.head("/api/users/check/does-not-exist")
    assert response.status_code == 404


def test_get_user_security_details(auth_client: TestClient):
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
    assert ExEF.validate(response.content), "Did not return an encrypted response"


def test_get_user_info(auth_client: TestClient):
    # Without authentication, it should fail
    response = client.get("/api/users/info/test-user")
    assert response.status_code == 401

    # With authentication, it should succeed
    response = auth_client.get("/api/users/info/test-user")
    assert response.status_code == 200
    assert ExEF.validate(response.content), "Did not return an encrypted response"

    response = ExEF(b"one demo 16B key").decrypt(response.content)
    assert response == b"Some Sample Info"


def test_edit_user_info(auth_client: TestClient):
    # Without authentication, it should fail
    response = client.post("/api/users/edit-info/test-user", json="New Info")
    assert response.status_code == 401

    # With authentication, it should succeed
    response = auth_client.post("/api/users/edit-info/test-user", json="New Info")
    assert response.status_code == 200

    # Check that the info was updated
    response = auth_client.get("/api/users/info/test-user")
    assert response.status_code == 200
    response = ExEF(b"one demo 16B key").decrypt(response.content)
    assert response == b"New Info"


def test_edit_user_info_transit_encryption(auth_client: TestClient):
    headers = {
        "Content-Type": "application/octet-stream",
        "X-Encrypted": "true",
        "X-Content-Type": "application/json",
    }

    transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(b"New Encrypted Data")
    response = auth_client.post(
        "/api/users/edit-info/test-user",
        headers=headers,
        content=transit_encrypted_data,
    )
    assert response.status_code == 200

    # Check that the info was updated
    response = auth_client.get("/api/users/info/test-user")
    assert response.status_code == 200
    response = ExEF(b"one demo 16B key").decrypt(response.content)
    assert response == b"New Encrypted Data"
