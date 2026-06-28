import json
from base64 import b64decode, b64encode

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque import OPAQUEServer
from excalibur_server.src.auth.opaque.test_operation import TestOPAQUERistretto255 as OPAQUETestVectors
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.elliptic import NoiseNK, Ristretto255
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.tables import User

client = TestClient(app)


class TestRegistration:
    @pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
    def test_registration(self, test_idx: int, monkeypatch: pytest.MonkeyPatch):
        username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")

        # Perform monkeypatching of ALL the functions
        # (Note that we monkeypatch the destination, not the source)
        monkeypatch.setattr(
            "excalibur_server.api.routes.auth.comms.opaque.registration.get_user", lambda _username: None
        )
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
        monkeypatch.setattr(
            "excalibur_server.api.routes.auth.comms.opaque.registration._get_opaque", lambda: mock_server
        )

        # Mock the adding of user
        added_user = None

        def mock_add_user(user: User):
            nonlocal added_user
            added_user = user

        monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.registration.add_user", mock_add_user)

        # Connect and register
        with client.websocket_connect("/api/auth/opaque/register") as ws:
            # Set up shared key using Noise-NK protocol
            noise = NoiseNK(CONFIG.security.account_creation.public_key)
            keyshare_pub, tag = noise.message_c_to_s(client_keyshare_priv=1234)
            to_send = keyshare_pub.to_bytes() + tag
            ws.send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

            server_keyshare_pub_and_tag = b64decode(ws.receive_json()["data"])
            server_keyshare_pub = Ristretto255.from_bytes(server_keyshare_pub_and_tag[: Ristretto255.KEY_LENGTH])
            server_tag = server_keyshare_pub_and_tag[Ristretto255.KEY_LENGTH :]
            session_key = noise.client_derive_session_key(1234, server_keyshare_pub, server_tag)

            # Helper functions for sending and receiving JSON messages
            def send_json(data: dict):
                encrypted_data = ExEF(session_key).encrypt(json.dumps(data).encode("utf-8"))
                ws.send_bytes(encrypted_data)

            def recv_json() -> dict:
                encrypted_data = ws.receive_bytes()
                return json.loads(ExEF(session_key).decrypt(encrypted_data))

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

    def test_noise_has_invalid_value(self):
        # Public value is invalid
        with client.websocket_connect("/api/auth/opaque/register") as ws:
            to_send = b"\x00" * (Ristretto255.KEY_LENGTH + 32)
            ws.send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

            response = ws.receive_json()
            assert response["status"] == "ERR"

        # Tag is invalid
        with client.websocket_connect("/api/auth/opaque/register") as ws:
            to_send = Ristretto255.GENERATOR.to_bytes() + b"\x00" * 32
            ws.send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

            response = ws.receive_json()
            assert response["status"] == "ERR"
