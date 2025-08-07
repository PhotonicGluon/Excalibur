from datetime import datetime, timedelta

from fastapi import status
from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


def test_clock():
    """Test the clock endpoint with GET request."""
    response = client.get("/api/well-known/clock")
    assert response.status_code == status.HTTP_200_OK

    response_time = datetime.fromisoformat(response.text)
    assert response_time - datetime.now().astimezone() < timedelta(seconds=1)
