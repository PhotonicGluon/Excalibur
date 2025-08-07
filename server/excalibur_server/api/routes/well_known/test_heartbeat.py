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


# TODO: Also test the authentication version of the heartbeat
