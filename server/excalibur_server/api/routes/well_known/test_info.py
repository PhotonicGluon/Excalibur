from datetime import datetime, timedelta

from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.meta import VERSION
from excalibur_server.src.config import CONFIG

client = TestClient(app)


def test_info():
    """Test the info endpoint with GET request."""
    response = client.get("/api/well-known/info")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Check main data
    assert data["version"] == VERSION
    assert data["max_upload_size"] == CONFIG.storage.max_upload_size

    # Check time
    response_time = datetime.fromisoformat(data["time"])
    assert datetime.now().astimezone() - response_time < timedelta(seconds=1)
