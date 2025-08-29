import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.users import get_user

if not get_user("test-user"):
    pytest.skip("test-user does not exist", allow_module_level=True)

client = TestClient(app)


def test_check_user():
    # Test that the user exists
    response = client.head("/api/users/check/test-user")
    assert response.status_code == 200

    # Non-existant user should be 404
    response = client.head("/api/users/check/does-not-exist")
    assert response.status_code == 404


def test_get_user_security_details():
    response = client.get("/api/users/security/test-user")
    assert response.status_code == 200
    data = response.json()
    assert "auk_salt" in data
    assert "srp_salt" in data


def test_get_user_vault_key(auth_key):
    # Without authentication, it should fail
    response = client.get("/api/users/vault/test-user")
    assert response.status_code == 401

    # With authentication, it should succeed
    response = client.get("/api/users/vault/test-user", headers={"Authorization": f"Bearer {auth_key}"})
    assert response.status_code == 200
