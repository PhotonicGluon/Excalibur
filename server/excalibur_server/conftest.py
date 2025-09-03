from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.auth.token.auth import generate_auth_token


@pytest.fixture
def auth_client() -> TestClient:
    """
    An authenticated client for testing.
    """

    token = generate_auth_token("test-user", b"one demo 16B key", datetime.now(tz=timezone.utc).timestamp() + 9999)
    client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
    yield client
