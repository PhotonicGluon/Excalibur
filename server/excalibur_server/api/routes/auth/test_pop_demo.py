import os
from base64 import b64encode
from urllib.parse import quote_plus

import pytest
from Crypto.Random import get_random_bytes
from fastapi import status
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from excalibur_server.env import is_debug
from excalibur_server.src.auth.pop import generate_pop_header

if not is_debug():
    pytest.skip("Debug mode not enabled", allow_module_level=True)


@pytest.fixture(scope="module", autouse=True)
def enable_proof():
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "1"
    yield
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "0"


@pytest.fixture(scope="class")
def auth_token(auth_client: TestClient):
    return auth_client.headers["Authorization"].removeprefix("Bearer ")


def _gen_nonce():
    return get_random_bytes(16)


class TestHTTPPoPChecks:
    def test_no_pop(self, auth_client: TestClient):
        response = auth_client.get("/api/auth/pop-demo")
        assert response.status_code == 401
        assert response.json()["detail"] == "Missing PoP"

    def test_invalid_pop(self, auth_client: TestClient):
        response = auth_client.get("/api/auth/pop-demo", headers={"X-SRP-PoP": "invalid-pop"})
        assert response.status_code == 422

    def test_invalid_timestamp(self, auth_client: TestClient):
        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={
                "X-SRP-PoP": "0 "
                + b64encode(_gen_nonce()).decode("UTF-8")
                + " "
                + b64encode(b"\x00" * 32).decode("UTF-8")
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid timestamp"

    def test_invalid_future_timestamp(self, auth_client: TestClient):
        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={
                "X-SRP-PoP": "9999999999 "
                + b64encode(_gen_nonce()).decode("UTF-8")
                + " "
                + b64encode(b"\x00" * 32).decode("UTF-8")
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid timestamp"

    def test_incorrect_method(self, auth_client: TestClient):
        import time

        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={
                "X-SRP-PoP": generate_pop_header(
                    master_key=b"one demo 16B key",
                    method="WRONG",
                    path="/api/auth/pop-demo",
                    timestamp=int(time.time()),
                    nonce=_gen_nonce(),
                )
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid PoP"

    def test_incorrect_path(self, auth_client: TestClient):
        import time

        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={
                "X-SRP-PoP": generate_pop_header(
                    master_key=b"one demo 16B key",
                    method="GET",
                    path="/api/some-incorrect-path",
                    timestamp=int(time.time()),
                    nonce=_gen_nonce(),
                )
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid PoP"

    def test_nonce_reuse(self, auth_client: TestClient):
        import time

        nonce = _gen_nonce()
        header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="GET",
            path="/api/auth/pop-demo",
            timestamp=int(time.time()),
            nonce=nonce,
        )

        # First request should succeed
        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={"X-SRP-PoP": header},
        )
        assert response.status_code == 200
        assert response.json()["username"] == "test-user"

        # Second request should fail
        response = auth_client.get(
            "/api/auth/pop-demo",
            headers={"X-SRP-PoP": header},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Nonce reused"


class TestWebsocketPoPChecks:
    def test_no_pop(self, auth_client: TestClient, auth_token: str):
        with pytest.raises(WebSocketDisconnect) as e:
            with auth_client.websocket_connect(f"/api/auth/pop-demo/ws?auth_token={auth_token}"):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION
        assert e.value.reason == "Missing PoP"

    def test_invalid_pop(self, auth_client: TestClient, auth_token: str):
        with pytest.raises(WebSocketDisconnect) as e:
            with auth_client.websocket_connect(
                f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation=invalid-pop"
            ):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION

    def test_invalid_timestamp(self, auth_client: TestClient, auth_token: str):
        with pytest.raises(WebSocketDisconnect) as e:
            wrong_pop = "0 " + b64encode(_gen_nonce()).decode("UTF-8") + " " + b64encode(b"\x00" * 32).decode("UTF-8")
            with auth_client.websocket_connect(
                f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation=" + quote_plus(wrong_pop),
            ):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION
        assert e.value.reason == "Invalid timestamp"

    def test_incorrect_method(self, auth_client: TestClient, auth_token: str):
        import time

        pop_header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="WRONG",
            path="/api/auth/pop-demo/ws",
            timestamp=int(time.time()),
            nonce=_gen_nonce(),
        )

        with pytest.raises(WebSocketDisconnect) as e:
            with auth_client.websocket_connect(
                f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}",
            ):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION
        assert e.value.reason == "Invalid PoP"

    def test_incorrect_path(self, auth_client: TestClient, auth_token: str):
        import time

        pop_header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="WEBSOCKET",
            path="/api/some-incorrect-path",
            timestamp=int(time.time()),
            nonce=_gen_nonce(),
        )
        with pytest.raises(WebSocketDisconnect) as e:
            with auth_client.websocket_connect(
                f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}",
            ):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION
        assert e.value.reason == "Invalid PoP"

    def test_nonce_reuse(self, auth_client: TestClient, auth_token: str):
        import time

        nonce = _gen_nonce()
        header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="WEBSOCKET",
            path="/api/auth/pop-demo/ws",
            timestamp=int(time.time()),
            nonce=nonce,
        )

        # First request should succeed
        with auth_client.websocket_connect(
            f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation={quote_plus(header)}",
        ):
            pass

        # Second request should fail
        with pytest.raises(WebSocketDisconnect) as e:
            with auth_client.websocket_connect(
                f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation={quote_plus(header)}",
            ):
                pass

        assert e.value.code == status.WS_1008_POLICY_VIOLATION
        assert e.value.reason == "Nonce reused"


def test_get(auth_client: TestClient):
    import time

    response = auth_client.get(
        "/api/auth/pop-demo",
        headers={
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="GET",
                path="/api/auth/pop-demo",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["username"] == "test-user"


def test_get_with_path(auth_client: TestClient):
    import time

    from excalibur_server.src.exef import ExEF

    # Non-encrypted path parameter
    response = auth_client.get(
        "/api/auth/pop-demo-get/hello-world",
        headers={
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="GET",
                path="/api/auth/pop-demo-get/hello-world",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["data"] == "hello-world"

    # Encrypted path parameter
    path_encrypted_data = ExEF(b"one demo 16B key").encrypt(b"foo bar")
    path_b64 = b64encode(path_encrypted_data, altchars=b"-_").decode("utf-8")

    response = auth_client.get(
        f"/api/auth/pop-demo-get/{path_b64}",
        headers={
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="GET",
                path=f"/api/auth/pop-demo-get/{path_b64}",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            ),
            "X-Encrypted": "true",  # Need to specify
        },
    )
    assert response.status_code == 200
    assert response.json()["data"] == "foo bar"


def test_post_no_encrypt(auth_client: TestClient):
    import time

    response = auth_client.post(
        "/api/auth/pop-demo",
        headers={
            "X-SRP-PoP": generate_pop_header(
                master_key=b"one demo 16B key",
                method="POST",
                path="/api/auth/pop-demo",
                timestamp=int(time.time()),
                nonce=_gen_nonce(),
            )
        },
        json="hello world",
    )
    assert response.status_code == 200
    assert response.json()["credential"]["username"] == "test-user"
    assert response.json()["data"] == "hello world"


def test_post_encrypted(auth_client: TestClient):
    import json
    import time

    from excalibur_server.src.exef import ExEF

    transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(b"hello world")
    hmac_header = generate_pop_header(
        master_key=b"one demo 16B key",
        method="POST",
        path="/api/auth/pop-demo/encrypted",
        timestamp=int(time.time()),
        nonce=_gen_nonce(),
    )

    response = auth_client.post(
        "/api/auth/pop-demo/encrypted",
        headers={
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
            "X-SRP-PoP": hmac_header,
        },
        content=transit_encrypted_data,
    )
    assert response.status_code == 200
    response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
    assert response["credential"]["username"] == "test-user"
    assert response["data"] == "hello world"


def test_websocket(auth_client: TestClient, auth_token: str):
    import time

    nonce = _gen_nonce()
    header = generate_pop_header(
        master_key=b"one demo 16B key",
        method="WEBSOCKET",
        path="/api/auth/pop-demo/ws",
        timestamp=int(time.time()),
        nonce=nonce,
    )

    with auth_client.websocket_connect(
        f"/api/auth/pop-demo/ws?auth_token={auth_token}&hmac_validation={quote_plus(header)}",
    ) as websocket:
        websocket.send_text("hello world")
        response = websocket.receive_text()
        assert response == "test-user: hello world"
