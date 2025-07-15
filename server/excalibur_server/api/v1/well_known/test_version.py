from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.api.meta import VERSION

client = TestClient(app)


def test_version():
    """Test the version endpoint with GET request."""
    response = client.get("/api/v1/well-known/version")
    assert response.status_code == status.HTTP_200_OK
    assert response.text == f'"{VERSION}"'
