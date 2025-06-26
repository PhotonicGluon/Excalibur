from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


def test_heartbeat_no_auth():
    """Test the heartbeat endpoint with HEAD request."""
    response = client.head("/api/v1/well-known/heartbeat")
    assert response.status_code == status.HTTP_200_OK
    assert "Cache-Control" in response.headers
    assert "no-cache, no-store, must-revalidate" in response.headers["Cache-Control"]


# TODO: Also test the authentication version of the heartbeat
