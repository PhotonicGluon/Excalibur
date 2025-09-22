import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app

client = TestClient(app)


@pytest.mark.parametrize("route", ["/well-known/version", "/docs", "/redoc", "/openapi.json"])
def test_api_prefix_only(route: str):
    """
    Check that only routes with the `/api` prefix exist.
    """

    # Without API prefix, it does not exist
    response = client.get(route)
    assert response.status_code == 404

    # With API prefix, it exists
    response = client.get("/api" + route)
    assert response.status_code == 200
