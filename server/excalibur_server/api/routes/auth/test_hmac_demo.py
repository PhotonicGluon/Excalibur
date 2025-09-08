import os

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.misc import is_debug
from excalibur_server.src.auth.hmac import generate_hmac_header

if not is_debug():
    pytest.skip("Debug mode not enabled", allow_module_level=True)


@pytest.fixture(scope="module", autouse=True)
def enable_hmac():
    os.environ["EXCALIBUR_SERVER_HMAC_ENABLED"] = "true"
    yield
    os.environ["EXCALIBUR_SERVER_HMAC_ENABLED"] = "false"


def _gen_nonce():
    return os.urandom(8).hex()


class TestBasicHMACChecks:
    def test_no_hmac(self, auth_client: TestClient):
        response = auth_client.get("/api/auth/hmac-demo")
        assert response.status_code == 401
        assert response.json()["detail"] == "Missing HMAC"

    def test_invalid_hmac(self, auth_client: TestClient):
        response = auth_client.get("/api/auth/hmac-demo", headers={"X-SRP-HMAC": "invalid-hmac"})
        assert response.status_code == 422

    def test_invalid_timestamp(self, auth_client: TestClient):
        response = auth_client.get(
            "/api/auth/hmac-demo",
            headers={"X-SRP-HMAC": "0 " + "0" * 16 + " " + "0" * 64},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid timestamp"


def test_get(auth_client: TestClient):
    import time

    response = auth_client.get(
        "/api/auth/hmac-demo",
        headers={
            "X-SRP-HMAC": generate_hmac_header(
                master_key=b"one demo 16B key",
                method="GET",
                path="/api/auth/hmac-demo",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
    )
    assert response.status_code == 200
    assert response.json() == "test-user"


def test_post_no_encrypt(auth_client: TestClient):
    import time

    response = auth_client.post(
        "/api/auth/hmac-demo",
        headers={
            "X-SRP-HMAC": generate_hmac_header(
                master_key=b"one demo 16B key",
                method="POST",
                path="/api/auth/hmac-demo",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
        json="hello world",
    )
    assert response.status_code == 200

    response = response.json()
    assert response["credential"] == "test-user"
    assert response["data"] == "hello world"


def test_post_encrypted(auth_client: TestClient):
    import json
    import time

    from excalibur_server.src.exef import ExEF

    transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(b"hello world")
    hmac_header = generate_hmac_header(
        master_key=b"one demo 16B key",
        method="POST",
        path="/api/auth/hmac-demo/encrypted",
        timestamp=int(time.time()),
        nonce=_gen_nonce(),
    )

    response = auth_client.post(
        "/api/auth/hmac-demo/encrypted",
        headers={
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
            "X-SRP-HMAC": hmac_header,
        },
        content=transit_encrypted_data,
    )
    assert response.status_code == 200

    response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
    assert response["credential"] == "test-user"
    assert response["data"] == "hello world"
