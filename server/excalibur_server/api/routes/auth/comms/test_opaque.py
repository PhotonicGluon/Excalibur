import json
from base64 import b64decode, b64encode

import pytest
from Crypto.Cipher import AES
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer
from excalibur_server.src.auth.opaque.test_operation import TestOPAQUERistretto255 as OPAQUETestVectors
from excalibur_server.src.db.tables import User

client = TestClient(app)


@pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
def test_auth_negotiation(test_idx: int, monkeypatch: pytest.MonkeyPatch):
    username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")
    user = User(
        username=username,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        registration_record=OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx],
        key_enc=b"Doesn't Matter",
    )

    # Perform monkeypatching of ALL the functions
    # (Note that we monkeypatch the destination, not the source)
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.login.get_user", lambda _username: user)
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
        # Send a verified username and KE1
        ws.send_json({"data": username})
        ws.send_json({"data": b64encode(OPAQUETestVectors.KE1[test_idx]).decode("utf-8"), "binary": True})

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


# TODO: Test aborting on invalid parameters
