from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


def _send_compatibility_request(version: str):
    """Send a compatibility request."""

    return client.get(f"/api/v1/well-known/compatible?version={version}")


def test_compatibility_normal():
    """Test the compatibility endpoint with normal version."""

    response = _send_compatibility_request("0.0.0")
    assert response.status_code == status.HTTP_200_OK


def test_compatibility_abnormal():
    """Test the compatibility endpoint with abnormal versions."""

    # Should reject non-versions
    response = _send_compatibility_request("not-a-version")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Version should not have leading `v`
    response = _send_compatibility_request("v0.0.0")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
