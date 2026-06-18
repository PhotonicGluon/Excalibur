import json
import time
from base64 import b64decode, b64encode
from urllib.parse import quote_plus

import pytest
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer
from excalibur_server.src.auth.opaque.test_operation import TestOPAQUERistretto255 as OPAQUETestVectors
from excalibur_server.src.auth.pop import generate_pop_header
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.tables import FSItem, User
from excalibur_server.src.exef import ExEF
from excalibur_server.src.users import get_user_from_id

client = TestClient(app)


@pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
def test_change_password(test_idx: int, db_session: Session, monkeypatch: pytest.MonkeyPatch):
    CHANGE_PASSWORD_PATH = "/api/auth/opaque/change-password"
    COMM_UUID = "change-password-uuid"
    COMM_MASTER_KEY = b"demo 16B key 123"

    # Perform monkeypatching of ALL the functions
    # (Note that we monkeypatch the destination, not the source)
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.change_password._get_oprf_seed",
        lambda: OPAQUETestVectors.OPRF_SEEDS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.change_password._get_public_key",
        lambda: OPAQUETestVectors.SERVER_PUBLIC_KEYS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.change_password._get_credential_identifier",
        lambda _username: OPAQUETestVectors.CREDENTIAL_IDENTIFIERS[test_idx],
    )

    # Mock the server also
    mock_server = OPAQUEServer(oprf_type="ristretto255-sha512")
    mock_server.context = OPAQUETestVectors.CONTEXTS[test_idx]
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.change_password._get_opaque", lambda: mock_server
    )

    # Add test user
    try:
        username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")
        test_user = User(
            username=username,
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            registration_record=b"Fake Registration Record",
            additional_info=f"Some Sample Info for {username}",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        root_folder = FSItem(name=str(test_user.id), parent_id=None, is_folder=True)
        root_folder.root_id = root_folder.id
        test_user.fsitem_id = root_folder.id
        db_session.add(root_folder)
        db_session.add(test_user)
        db_session.commit()

        # Check existing user has the correct registration record
        assert get_user_from_id(test_user.id).registration_record == b"Fake Registration Record"

        # Create a new authenticated client
        MASTER_KEYS_CACHE[COMM_UUID] = COMM_MASTER_KEY
        token = generate_auth_token(str(test_user.id), COMM_UUID, 9_999_999_999)
        auth_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
        pop_header = generate_pop_header(
            master_key=COMM_MASTER_KEY,
            method="WEBSOCKET",
            path=CHANGE_PASSWORD_PATH,
            timestamp=int(time.time()),
            nonce=get_random_bytes(16),
        )

        # Connect and change password
        with auth_client.websocket_connect(
            f"{CHANGE_PASSWORD_PATH}?auth_token={token}&hmac_validation={quote_plus(pop_header)}&encrypted=false"
        ) as ws:
            # Helper functions for sending and receiving JSON messages
            def send_json(data: dict):
                encrypted_data = ExEF(COMM_MASTER_KEY).encrypt(json.dumps(data).encode("utf-8"))
                ws.send_bytes(encrypted_data)

            def recv_json() -> dict:
                encrypted_data = ws.receive_bytes()
                return json.loads(ExEF(COMM_MASTER_KEY).decrypt(encrypted_data))

            # Send registration request
            to_send = OPAQUETestVectors.REGISTRATION_REQUESTS[test_idx]
            send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

            # Receive registration response
            registration_response_raw = recv_json()
            assert registration_response_raw.get("binary") is True
            registration_response = b64decode(registration_response_raw["data"])
            assert registration_response == OPAQUETestVectors.REGISTRATION_RESPONSES[test_idx]

            # Send registration record
            to_send = OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]
            send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

            # Receive confirmation
            assert recv_json()["status"] == "OK"

            # Verify registration record has changed
            assert (
                get_user_from_id(test_user.id).registration_record == OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]
            )

    finally:
        # Clean up
        db_session.delete(test_user)
        db_session.delete(root_folder)
        db_session.commit()


@pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
def test_login(test_idx: int, monkeypatch: pytest.MonkeyPatch):
    username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")
    user = User(
        username=username,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        registration_record=OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx],
        key_enc=b"Doesn't Matter",
    )

    # Perform monkeypatching of ALL the functions
    # (Note that we monkeypatch the destination, not the source)
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.login.get_user", lambda _user: user)
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_oprf_seed",
        lambda: OPAQUETestVectors.OPRF_SEEDS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_public_key",
        lambda: OPAQUETestVectors.SERVER_PUBLIC_KEYS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_private_key",
        lambda: OPAQUETestVectors.SERVER_PRIVATE_KEYS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_client_identity",
        lambda _username: OPAQUETestVectors.CLIENT_IDENTITIES[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_server_identity",
        lambda: OPAQUETestVectors.SERVER_IDENTITIES[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_credential_identifier",
        lambda _username: OPAQUETestVectors.CREDENTIAL_IDENTIFIERS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_masking_nonce",
        lambda: OPAQUETestVectors.MASKING_NONCES[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_nonce",
        lambda: OPAQUETestVectors.SERVER_NONCES[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.login._get_keyshare_seed",
        lambda: OPAQUETestVectors.SERVER_KEYSHARE_SEEDS[test_idx],
    )

    # Mock the server also
    mock_server = OPAQUEServer(oprf_type="ristretto255-sha512")
    mock_server.context = OPAQUETestVectors.CONTEXTS[test_idx]
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.login._get_opaque", lambda: mock_server)

    # Connect and authenticate
    with client.websocket_connect("/api/auth/opaque") as ws:
        # Send KE1 and a verified username
        to_send = OPAQUETestVectors.KE1[test_idx] + username.encode("utf-8")
        ws.send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

        # Receive KE2, should not be an error
        response: dict = ws.receive_json()
        assert response.get("status") != "ERR", "Server returned an error: " + response["data"]

        # Check KE2 message
        assert response.get("binary"), "KE2 message should be binary"
        assert response.get("data"), "KE2 message should have data"
        assert b64decode(response.get("data")) == OPAQUETestVectors.KE2[test_idx], (
            "KE2 message should match test vector"
        )

        # Send KE3 message
        ws.send_json({"data": b64encode(OPAQUETestVectors.KE3[test_idx]).decode("utf-8"), "binary": True})

        # Check received auth token
        expected_master_key = mock_server.kdf.expand(OPAQUETestVectors.SESSION_KEYS[test_idx], b"Master Key", 32)
        auth_token_data = json.loads(ws.receive_json()["data"])
        cipher = AES.new(
            expected_master_key,
            AES.MODE_GCM,
            nonce=b64decode(auth_token_data["nonce"]),
        )
        cipher.decrypt(b64decode(auth_token_data["token"]))
        cipher.verify(b64decode(auth_token_data["tag"]))


@pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
def test_registration(test_idx: int, monkeypatch: pytest.MonkeyPatch):
    username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")

    # Perform monkeypatching of ALL the functions
    # (Note that we monkeypatch the destination, not the source)
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.registration.get_user", lambda _username: None)
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.registration._get_oprf_seed",
        lambda: OPAQUETestVectors.OPRF_SEEDS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.registration._get_public_key",
        lambda: OPAQUETestVectors.SERVER_PUBLIC_KEYS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.registration._get_credential_identifier",
        lambda _username: OPAQUETestVectors.CREDENTIAL_IDENTIFIERS[test_idx],
    )

    # Mock the server also
    mock_server = OPAQUEServer(oprf_type="ristretto255-sha512")
    mock_server.context = OPAQUETestVectors.CONTEXTS[test_idx]
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.registration._get_opaque", lambda: mock_server)

    # Mock the adding of user
    added_user = None

    def mock_add_user(user: User):
        nonlocal added_user
        added_user = user

    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.registration.add_user", mock_add_user)

    # Connect and register
    with client.websocket_connect("/api/auth/opaque/register") as ws:
        # Helper functions for sending and receiving JSON messages
        def send_json(data: dict):
            encrypted_data = ExEF(CONFIG.security.account_creation_key).encrypt(json.dumps(data).encode("utf-8"))
            ws.send_bytes(encrypted_data)

        def recv_json() -> dict:
            encrypted_data = ws.receive_bytes()
            return json.loads(ExEF(CONFIG.security.account_creation_key).decrypt(encrypted_data))

        # Send registration request and username
        to_send = OPAQUETestVectors.REGISTRATION_REQUESTS[test_idx] + username.encode("utf-8")
        send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

        # Receive registration response
        registration_response_raw = recv_json()
        assert registration_response_raw.get("binary") is True
        registration_response = b64decode(registration_response_raw["data"])
        assert registration_response == OPAQUETestVectors.REGISTRATION_RESPONSES[test_idx]

        # Send registration record, AUK salt, and encrypted vault key
        to_send = (
            OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]  # Registration record
            + b"one 32 byte string for testing!!"  # AUK salt
            + b"Some value"  # key_enc
        )
        send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

        # Receive confirmation
        assert recv_json()["status"] == "OK"

        # Verify user was added
        assert added_user is not None
        assert added_user.username == username
        assert added_user.auth_protocol == AuthProtocol.OPAQUE_3DH
        assert added_user.registration_record == OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]
        assert added_user.auk_salt == b"one 32 byte string for testing!!"
        assert added_user.key_enc == b"Some value"
