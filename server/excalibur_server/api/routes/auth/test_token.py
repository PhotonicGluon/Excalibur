import os

import pytest
from Crypto.Random import get_random_bytes
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.api.misc import is_debug
from excalibur_server.src.auth.credentials import check_auth_token


@pytest.fixture(scope="module", autouse=True)
def enable_proof():
    os.environ["EXCALIBUR_SERVER_POP_ENABLED"] = "true"
    yield
    os.environ["EXCALIBUR_SERVER_POP_ENABLED"] = "false"


def _gen_nonce():
    return get_random_bytes(16)


def test_get_token():
    import time
    from datetime import datetime, timezone

    from excalibur_server.api.cache import MASTER_KEYS_CACHE
    from excalibur_server.src.auth.credentials import generate_auth_token
    from excalibur_server.src.auth.pop import generate_pop_header
    from excalibur_server.src.exef import ExEF

    # Create a custom client for this test
    MASTER_KEYS_CACHE["foo-bar"] = b"one demo 16B key"
    token = generate_auth_token("test-user", "foo-bar", datetime.now(tz=timezone.utc).timestamp() + 9999)
    client = TestClient(app, headers={"Authorization": f"Bearer {token}"})

    # Get a new token
    response = client.get(
        "/api/auth/token",
        headers={
            # Checking whether PoP works is handled in `test_pop_demo.py`
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="GET",
                path="/api/auth/token",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
    )
    assert response.status_code == 200

    # Make sure response was encrypted
    encrypted_new_token = response.content
    assert ExEF.validate(encrypted_new_token)

    # Decrypt response
    new_token = ExEF(key=b"one demo 16B key").decrypt(encrypted_new_token)

    # Check that the old UUID was invalidated
    assert "foo-bar" not in MASTER_KEYS_CACHE

    # Check that the new token is valid
    assert check_auth_token(new_token)


@pytest.mark.skipif(not is_debug(), reason="Debug mode required for generating token without auth")
def test_generate_token():
    client = TestClient(app)
    response = client.get(
        "/api/auth/generate-token",
        # Since this is only a demo route, we can assume that all parameters will be correct
        params={"username": "some-username-here", "expiry_time": 60, "master-key": "one demo 16B key"},
    )
    assert response.status_code == 200
    token = response.text
    assert check_auth_token(token)
