import time
from datetime import datetime, timezone
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
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF

LISTENER_PATH = "/api/files/listen"


def _auth_websocket(username: str, path: str):
    # Create a new authenticated client
    uuid = uuid4().hex
    MASTER_KEYS_CACHE[uuid] = b"one demo 16B key"
    token = generate_auth_token(username, uuid, datetime.now(tz=timezone.utc).timestamp() + 9999)
    auth_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})

    # Generate PoP header
    auth_token = auth_client.headers["Authorization"].removeprefix("Bearer ")
    pop_header = generate_pop_header(
        master_key=b"one demo 16B key",
        method="WEBSOCKET",
        path=path,
        timestamp=int(time.time()),
        nonce=get_random_bytes(16),
    )

    return auth_client, auth_token, pop_header


def _make_websocket(username: str, path: str, encrypted: bool = True):
    auth_client, auth_token, pop_header = _auth_websocket(username, path)
    with auth_client.websocket_connect(
        f"{path}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted={encrypted}"
    ) as ws:
        yield ws


class TestDirectoryChangesListener:
    @pytest.fixture
    def ws_client(self):
        yield from _make_websocket("test-user-db", LISTENER_PATH, encrypted=False)

    @pytest.fixture()
    def ws_client_encrypted(self):
        yield from _make_websocket("test-user-db", LISTENER_PATH, encrypted=True)

    @pytest.fixture(scope="class")
    def example_file(self, test_user, db_session: Session) -> Path:
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

    def test_new_folder_in_root(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the update was transmitted
        assert ws_client.receive_text() == "."

    def test_new_file_in_root(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        response = auth_client_db.post(f"/api/files/upload/test-{uuid}.txt.exef", content=b"Some Sample Content")
        assert response.status_code == 201

        # Check if the update was transmitted
        assert ws_client.receive_text() == "."

    def test_new_folder_in_folder(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client_db.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201

        # Create a subfolder
        uuid = uuid4().hex
        response = auth_client_db.post(f"/api/files/mkdir/{subdir}", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the updates were sent
        assert ws_client.receive_text() == "."
        assert ws_client.receive_text() == subdir

    def test_new_file_in_folder(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client_db.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201

        # Upload a file
        uuid = uuid4().hex
        response = auth_client_db.post(f"/api/files/upload/{subdir}/test-{uuid}.txt.exef", content=b"Some More Content")
        assert response.status_code == 201

        # Check if the updates were sent
        assert ws_client.receive_text() == "."
        assert ws_client.receive_text() == subdir

    def test_delete(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        response = auth_client_db.post(f"/api/files/upload/{file_name}", content=b"File content!")
        assert response.status_code == 201

        # Delete that file
        response = auth_client_db.delete(f"/api/files/delete/{file_name}")
        assert response.status_code == 200

        # Check if the updates was transmitted
        assert ws_client.receive_text() == "."  # Once for creation...
        assert ws_client.receive_text() == "."  # ...once for deletion

    def test_rename(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        response = auth_client_db.post(f"/api/files/upload/{file_name}", content=b"Foobar")
        assert response.status_code == 201

        # Rename file should work
        new_file_name = f"test-{uuid4().hex}.txt.exef"
        response = auth_client_db.post(f"/api/files/rename/{file_name}", json=new_file_name)
        assert response.status_code == 200

        # Check if the updates was transmitted
        assert ws_client.receive_text() == "."  # Once for creation...
        assert ws_client.receive_text() == "."  # ...once for update

    def test_encrypted(self, auth_client_db: TestClient, ws_client_encrypted: WebSocketTestSession):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the update was transmitted
        enc_data = ws_client_encrypted.receive_bytes()
        assert enc_data

        # Check received path
        path = ExEF(b"one demo 16B key").decrypt(enc_data)
        assert path.decode("utf-8") == "."

    def test_multi_connection(
        self, auth_client_db: TestClient, ws_client: WebSocketTestSession, ws_client_encrypted: WebSocketTestSession
    ):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201

        # Check if the updates were transmitted
        assert ws_client.receive_text() == "."
        assert ExEF(b"one demo 16B key").decrypt(ws_client_encrypted.receive_bytes()).decode("utf-8") == "."

    def test_duplicate_connection(self, auth_client_db: TestClient):
        auth_client, auth_token, pop_header = _auth_websocket("test-user-db", LISTENER_PATH)
        with auth_client.websocket_connect(
            f"{LISTENER_PATH}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted=false"
        ) as ws1:
            with auth_client.websocket_connect(
                f"{LISTENER_PATH}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted=false"
            ) as ws2:
                response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid4().hex}")
                assert response.status_code == 201

                assert ws1.receive_text() == "."
                assert ws2.receive_text() == "."

    def test_multi_requests(self, auth_client_db: TestClient, ws_client: WebSocketTestSession):
        # Create folders
        for _ in range(10):
            response = auth_client_db.post("/api/files/mkdir/.", json=f"test-multi-create-{uuid4().hex}")
            assert response.status_code == 201

        # Check if the updates were transmitted
        assert ws_client.receive_text() == "."  # Initial creation
        assert ws_client.receive_text() == "."  # Grouped creation requests
