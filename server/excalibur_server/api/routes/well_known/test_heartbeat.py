from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app

from .heartbeat import HEADERS

client = TestClient(app)


def test_heartbeat_no_auth():
    """Test the heartbeat endpoint with GET request."""

    response = client.get("/api/well-known/heartbeat")
    assert response.status_code == status.HTTP_200_OK
    assert "Cache-Control" in response.headers
    assert HEADERS["Cache-Control"] in response.headers["Cache-Control"]
    assert response.text == "OK"


def test_heartbeat_auth_only(auth_client: TestClient):
    """Test the heartbeat endpoint with GET request and authentication."""

    response = auth_client.get("/api/well-known/heartbeat")
    assert response.status_code == status.HTTP_200_OK
    assert "Cache-Control" in response.headers
    assert HEADERS["Cache-Control"] in response.headers["Cache-Control"]
    assert response.text == "OK"


def test_heartbeat_auth_and_pop(auth_client: TestClient):
    """Test the heartbeat endpoint with GET request, authentication, and PoP."""

    import time

    from Crypto.Random import get_random_bytes

    from excalibur_server.src.auth.pop import generate_pop_header

    response = auth_client.get(
        "/api/well-known/heartbeat",
        headers={
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="GET",
                path="/api/well-known/heartbeat",
                timestamp=int(time.time()),
                nonce=get_random_bytes(16),
            )
        },
    )
    assert response.status_code == status.HTTP_202_ACCEPTED
    assert "Cache-Control" in response.headers
    assert HEADERS["Cache-Control"] in response.headers["Cache-Control"]
    assert response.text == "Auth OK"
