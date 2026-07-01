import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.crypto.exef.structures import Footer, Header

TEST_KEY = b"one demo 16B key"
TEST_COMM_UUID = "middleware-test-uuid"


@pytest.fixture(scope="module", autouse=True)
def seed_cache():
    MASTER_KEYS_CACHE[TEST_COMM_UUID] = TEST_KEY
    yield
    MASTER_KEYS_CACHE.pop(TEST_COMM_UUID, None)


@pytest.fixture(scope="module")
def auth_header():
    token = generate_auth_token(
        "01234567-89ab-dcef-0123-456789abcdef",
        TEST_COMM_UUID,
        datetime.now(tz=timezone.utc).timestamp() + 9999,
    )
    return {"Authorization": f"Bearer {token}"}


def _valid_encrypted_body(plaintext: bytes) -> bytes:
    return ExEF(TEST_KEY).encrypt(plaintext)


def _strip_footer(exef_data: bytes) -> bytes:
    return exef_data[: -Footer.size]


def _flip_ciphertext_bit(exef_data: bytes) -> bytes:
    data = bytearray(exef_data)
    ct_start = Header.size
    ct_end = len(data) - Footer.size
    if ct_start < ct_end:
        data[ct_start] ^= 0x01
    return bytes(data)


class TestEncryptedBodyIntegrity:
    def test_valid_encrypted_body_is_accepted(self, auth_header):
        body = json.dumps("hello world").encode()
        encrypted = _valid_encrypted_body(body)

        with TestClient(app) as client:
            response = client.post(
                "/api/auth/pop-demo/encrypted",
                headers={
                    **auth_header,
                    "Content-Type": "application/octet-stream",
                    "X-Encrypted": "true",
                    "X-Content-Type": "text/plain",
                },
                content=encrypted,
            )
        # 200 OK with the decrypted payload echoed back (encrypted)
        assert response.status_code == 200

    def test_footer_stripped_body_is_rejected(self, auth_header):
        body = json.dumps("hello world").encode()
        tampered = _strip_footer(_valid_encrypted_body(body))

        with TestClient(app) as client:
            response = client.post(
                "/api/auth/pop-demo/encrypted",
                headers={
                    **auth_header,
                    "Content-Type": "application/octet-stream",
                    "X-Encrypted": "true",
                    "X-Content-Type": "text/plain",
                },
                content=tampered,
            )
        assert response.status_code == 401

    def test_tampered_ciphertext_is_rejected(self, auth_header):
        body = json.dumps("hello world").encode()
        tampered = _flip_ciphertext_bit(_valid_encrypted_body(body))

        with TestClient(app) as client:
            response = client.post(
                "/api/auth/pop-demo/encrypted",
                headers={
                    **auth_header,
                    "Content-Type": "application/octet-stream",
                    "X-Encrypted": "true",
                    "X-Content-Type": "text/plain",
                },
                content=tampered,
            )
        assert response.status_code == 401
