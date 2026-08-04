import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote_plus
from uuid import uuid4

import pytest
from Crypto.Random import get_random_bytes
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from starlette.testclient import WebSocketTestSession

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.pop import generate_pop_header
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem

LISTENER_PATH = "/api/files/listen"

USER_ID = "01234567-89ab-dcef-0123-456789abcdef"
KEY_1 = b"1st demo 16B key"
KEY_2 = b"2nd demo 16B key"


def _auth_websocket(user_id: str, key: bytes, path: str):
    # Create a new authenticated client
    uuid = uuid4().hex
    MASTER_KEYS_CACHE[uuid] = key
    token = generate_auth_token(user_id, uuid, datetime.now(tz=UTC).timestamp() + 9999)
    auth_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})

    # Generate PoP header
    auth_token = auth_client.headers["Authorization"].removeprefix("Bearer ")
    pop_header = generate_pop_header(
        master_key=key,
        method="WEBSOCKET",
        path=path,
        timestamp=int(time.time()),
        nonce=get_random_bytes(16),
    )

    return auth_client, auth_token, pop_header


def _make_websocket(user_id: str, key: bytes, path: str):
    auth_client, auth_token, pop_header = _auth_websocket(user_id, key, path)
    with auth_client.websocket_connect(
        f"{path}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}"
    ) as ws:
        yield ws


class TestDirectoryChangesListener:
    @pytest.fixture
    def ws_client(self):
        yield from _make_websocket(USER_ID, KEY_1, LISTENER_PATH)

    @pytest.fixture
    def ws_client_2(self):
        yield from _make_websocket(USER_ID, KEY_2, LISTENER_PATH)

    @pytest.fixture(scope="class")
    @classmethod
    def example_file(cls, test_user, db_session: Session) -> Path:
        root_id = test_user["root_id"]

        file_id = uuid4()
        file_path = CONFIG.storage.vault_folder / f"{file_id}.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        size = file_path.write_bytes(encrypted_data)

        file = FSItem(
            id=file_id,
            parent_id=root_id,
            root_id=root_id,
            name="test",
            is_folder=False,
            size=size,
        )
        db_session.add(file)
        db_session.commit()

        yield file

        if get_item(file_id) is not None:
            db_session.delete(file)
            db_session.commit()

        if file_path.exists():
            file_path.unlink()

    def test_connect(self, ws_client: WebSocketTestSession):
        assert ws_client, "Failed to connect to the WebSocket"

    def test_new_folder_in_root(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the update was transmitted
        enc_data = ws_client.receive_bytes()
        assert enc_data
        path = ExEF(KEY_1).decrypt(enc_data)
        assert path.decode("utf-8") == "."

    def test_new_file_in_root(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/test-{uuid}.txt.exef", content=b"Some Sample Content")
        assert response.status_code == 201

        # Check if the update was transmitted
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."

    def test_new_folder_in_folder(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201

        # Create a subfolder
        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/mkdir/{subdir}", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the updates were sent
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == subdir

    def test_new_file_in_folder(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201

        # Upload a file
        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/{subdir}/test-{uuid}.txt.exef", content=b"Some More Content")
        assert response.status_code == 201

        # Check if the updates were sent
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == subdir

    def test_delete(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        response = auth_client.post(f"/api/files/upload/{file_name}", content=b"File content!")
        assert response.status_code == 201

        # Delete that file
        response = auth_client.delete(f"/api/files/delete/{file_name}")
        assert response.status_code == 200

        # Check if the updates was transmitted
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # Once for creation...
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # ...once for deletion

    def test_rename(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        response = auth_client.post(f"/api/files/upload/{file_name}", content=b"Foobar")
        assert response.status_code == 201

        # Rename file should work
        new_file_name = f"test-{uuid4().hex}.txt.exef"
        response = auth_client.post(f"/api/files/rename/{file_name}", json=new_file_name)
        assert response.status_code == 200

        # Check if the updates was transmitted
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # Once for creation...
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # ...once for update

    def test_multi_connection(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, ws_client_2: WebSocketTestSession
    ):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the updates were transmitted
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."
        assert ExEF(KEY_2).decrypt(ws_client_2.receive_bytes()).decode("utf-8") == "."

    def test_duplicate_connection(self, auth_client: TestClient):
        auth_client, auth_token, pop_header = _auth_websocket(
            "01234567-89ab-dcef-0123-456789abcdef", KEY_1, LISTENER_PATH
        )
        with auth_client.websocket_connect(
            f"{LISTENER_PATH}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}"
        ) as ws1, auth_client.websocket_connect(
            f"{LISTENER_PATH}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}"
        ) as ws2:
            response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid4().hex}")
            assert response.status_code == 201

            assert ExEF(KEY_1).decrypt(ws1.receive_bytes()).decode("utf-8") == "."
            assert ExEF(KEY_1).decrypt(ws2.receive_bytes()).decode("utf-8") == "."

    def test_multi_requests(self, auth_client: TestClient, ws_client: WebSocketTestSession):
        # Create folders
        for _ in range(10):
            response = auth_client.post("/api/files/mkdir/.", json=f"test-multi-create-{uuid4().hex}")
            assert response.status_code == 201

        # Check if the updates were transmitted
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # Initial creation
        assert ExEF(KEY_1).decrypt(ws_client.receive_bytes()).decode("utf-8") == "."  # Grouped creation requests
