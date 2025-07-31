from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.meta import COMMIT, VERSION

client = TestClient(app)


def test_version():
    """Test the version endpoint with GET request."""
    response = client.get("/api/v1/well-known/version")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["version"] == VERSION
    assert data["commit"] == COMMIT
