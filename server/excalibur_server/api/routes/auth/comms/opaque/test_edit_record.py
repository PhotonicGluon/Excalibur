import json
import time
from base64 import b64decode, b64encode
from urllib.parse import quote_plus

import pytest
from Crypto.Random import get_random_bytes
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque import OPAQUEServer
from excalibur_server.src.auth.opaque.test_operation import TestOPAQUERistretto255 as OPAQUETestVectors
from excalibur_server.src.auth.pop import generate_pop_header
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.tables import FSItem, User
from excalibur_server.src.users import get_user_from_id

client = TestClient(app)


@pytest.mark.parametrize("test_idx", range(len(OPAQUETestVectors.CONTEXTS)))
def test_edit_record(test_idx: int, db_session: Session, monkeypatch: pytest.MonkeyPatch):
    EDIT_RECORD_PATH = "/api/auth/opaque/edit-record"
    COMM_UUID = "edit-record-uuid"
    COMM_MASTER_KEY = b"demo 16B key!!!!"
    NEW_USERNAMES = ["a-new-username", OPAQUETestVectors.CLIENT_IDENTITIES[1].decode("utf-8")]

    # Perform monkeypatching of ALL the functions
    # (Note that we monkeypatch the destination, not the source)
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.edit_record._get_oprf_seed",
        lambda: OPAQUETestVectors.OPRF_SEEDS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.edit_record._get_public_key",
        lambda: OPAQUETestVectors.SERVER_PUBLIC_KEYS[test_idx],
    )
    monkeypatch.setattr(
        "excalibur_server.api.routes.auth.comms.opaque.edit_record._get_credential_identifier",
        lambda _username: OPAQUETestVectors.CREDENTIAL_IDENTIFIERS[test_idx],
    )

    # Mock the server also
    mock_server = OPAQUEServer(oprf_type="ristretto255-sha512")
    mock_server.context = OPAQUETestVectors.CONTEXTS[test_idx]
    monkeypatch.setattr("excalibur_server.api.routes.auth.comms.opaque.edit_record._get_opaque", lambda: mock_server)

    # Add test user
    username = OPAQUETestVectors.CLIENT_IDENTITIES[test_idx].decode("utf-8")
    test_user = User(
        username=username,
        keygen_algorithm="Example Keygen Function",
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        registration_record=b"Fake Registration Record",
        vault_info=f"Some Sample Info for {username}",
        auk_salt=b"Initial AUK Salt",
        key_enc=b"Initial Encrypted Vault Key",
    )
    root_folder = FSItem(name=str(test_user.id), parent_id=None, is_folder=True)
    root_folder.root_id = root_folder.id
    test_user.fsitem_id = root_folder.id
    db_session.add(root_folder)
    db_session.add(test_user)
    db_session.commit()

    # Check existing user has the correct values
    starting_test_user = get_user_from_id(test_user.id)
    assert starting_test_user is not None
    assert starting_test_user.username == username
    assert starting_test_user.registration_record == b"Fake Registration Record"
    assert starting_test_user.auk_salt == b"Initial AUK Salt"
    assert starting_test_user.key_enc == b"Initial Encrypted Vault Key"

    # Create a new authenticated client
    MASTER_KEYS_CACHE[COMM_UUID] = COMM_MASTER_KEY
    token = generate_auth_token(str(test_user.id), COMM_UUID, 9_999_999_999)
    auth_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
    pop_header = generate_pop_header(
        master_key=COMM_MASTER_KEY,
        method="WEBSOCKET",
        path=EDIT_RECORD_PATH,
        timestamp=int(time.time()),
        nonce=get_random_bytes(16),
    )

    # Connect and change the record
    with auth_client.websocket_connect(
        f"{EDIT_RECORD_PATH}?auth_token={token}&hmac_validation={quote_plus(pop_header)}"
    ) as ws:
        # Helper functions for sending and receiving JSON messages
        def send_json(data: dict):
            encrypted_data = ExEF(COMM_MASTER_KEY).encrypt(json.dumps(data).encode("utf-8"))
            ws.send_bytes(encrypted_data)

        def recv_json() -> dict:
            encrypted_data = ws.receive_bytes()
            return json.loads(ExEF(COMM_MASTER_KEY).decrypt(encrypted_data))

        # Send registration request
        to_send = OPAQUETestVectors.REGISTRATION_REQUESTS[test_idx] + NEW_USERNAMES[test_idx].encode("utf-8")
        send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

        # Receive registration response
        registration_response_raw = recv_json()
        assert registration_response_raw.get("binary") is True
        registration_response = b64decode(registration_response_raw["data"])
        assert registration_response == OPAQUETestVectors.REGISTRATION_RESPONSES[test_idx]

        # Send registration record, AUK salt, and encrypted vault key
        to_send = (
            OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]  # Registration record
            + b"New AUK Salt, padded to 32 bytes"  # AUK salt
            + b"New Encrypted Vault Key"  # key_enc
        )
        send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})
        send_json({"data": b64encode(to_send).decode("utf-8"), "binary": True})

        # Receive confirmation
        assert recv_json()["status"] == "OK"

        # Verify registration record has changed
        ending_test_user = get_user_from_id(test_user.id)
        assert ending_test_user is not None
        assert ending_test_user.username == NEW_USERNAMES[test_idx]
        assert ending_test_user.registration_record == OPAQUETestVectors.REGISTRATION_UPLOADS[test_idx]
        assert ending_test_user.auk_salt == b"New AUK Salt, padded to 32 bytes"
        assert ending_test_user.key_enc == b"New Encrypted Vault Key"
