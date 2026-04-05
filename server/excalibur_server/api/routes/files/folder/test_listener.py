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
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


def _make_websocket(username: str, path: str, encrypted: bool = True):
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

    # Connect
    with auth_client.websocket_connect(
        f"{path}?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted={encrypted}"
    ) as ws:
        yield ws


class TestDirectoryChangesListener:
    @pytest.fixture
    def ws_client(self):
        yield from _make_websocket("test-user-db", "/api/files/listen", encrypted=False)

    @pytest.fixture()
    def ws_client_encrypted(self):
        yield from _make_websocket("test-user-db", "/api/files/listen", encrypted=True)

    @pytest.fixture(scope="class")
    def example_file(self, test_user, test_user_db_vault_folder: Path, db_session: Session) -> Path:
        root_id = test_user["root_id"]

        file_id = uuid4()
        file_path = test_user_db_vault_folder / f"{file_id}.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        size = file_path.write_bytes(encrypted_data)

        file = FSItem(
            id=file_id,
            parent_id=root_id,
            root_id=root_id,
            name="test",
            is_folder=False,
            size=size,
            mimetype="text/plain",
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

    def test_new_folder_in_folder(
        self, auth_client_db: TestClient, ws_client: WebSocketTestSession, test_user_vault_folder: Path
    ):
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


# Legacy tests (without database filesystem)
class TestDirectoryChangesListenerOld:
    @pytest.fixture
    def ws_client(self):
        yield from _make_websocket("test-user", "/api/files/listen", encrypted=False)

    @pytest.fixture()
    def ws_client_encrypted(self):
        yield from _make_websocket("test-user", "/api/files/listen", encrypted=True)

    @pytest.fixture(scope="class")
    def example_file(self, tmp_path_factory: pytest.TempPathFactory) -> Path:
        file = tmp_path_factory.mktemp("test") / "test.txt.exef"

        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file.write_bytes(encrypted_data)
        yield file
        file.unlink()

    def test_connect(self, ws_client: WebSocketTestSession):
        assert ws_client, "Failed to connect to the WebSocket"

    def test_new_folder_in_root(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, test_user_vault_folder: Path
    ):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

        # Check if the update was transmitted
        assert ws_client.receive_text() == "."

    def test_new_file_in_root(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, example_file: Path, test_user_vault_folder: Path
    ):
        # Upload a file
        uuid = uuid4().hex
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/test-{uuid}.txt.exef", content=f)
        assert response.status_code == 201
        uploaded_file = test_user_vault_folder / f"test-{uuid}.txt.exef"
        assert uploaded_file.exists()

        # Check if the update was transmitted
        assert ws_client.receive_text() == "."

    def test_new_folder_in_folder(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, test_user_vault_folder: Path
    ):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201
        assert (test_user_vault_folder / subdir).exists()

        # Create a subfolder
        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/mkdir/{subdir}", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert (test_user_vault_folder / f"{subdir}/test-dir-{uuid}").exists()

        # Check if the updates were sent
        assert ws_client.receive_text() == "."
        assert ws_client.receive_text() == subdir

    def test_new_file_in_folder(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, example_file: Path, test_user_vault_folder: Path
    ):
        # Create a folder
        uuid = uuid4().hex
        subdir = f"test-dir-{uuid}"
        response = auth_client.post("/api/files/mkdir/.", json=subdir)
        assert response.status_code == 201
        assert (test_user_vault_folder / subdir).exists()

        # Upload a file
        uuid = uuid4().hex
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/{subdir}/test-{uuid}.txt.exef", content=f)
        assert response.status_code == 201
        uploaded_file = test_user_vault_folder / f"{subdir}/test-{uuid}.txt.exef"
        assert uploaded_file.exists()

        # Check if the updates were sent
        assert ws_client.receive_text() == "."
        assert ws_client.receive_text() == subdir

    def test_delete(
        self, auth_client: TestClient, ws_client: WebSocketTestSession, example_file: Path, test_user_vault_folder: Path
    ):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/{file_name}", content=f)
        assert response.status_code == 201
        uploaded_file = test_user_vault_folder / file_name
        assert uploaded_file.exists()

        # Delete that file
        response = auth_client.delete(f"/api/files/delete/{file_name}")
        assert response.status_code == 200
        assert not uploaded_file.exists()

        # Check if the updates was transmitted
        assert ws_client.receive_text() == "."  # Once for creation...
        assert ws_client.receive_text() == "."  # ...once for deletion

    def test_rename(
        self,
        auth_client: TestClient,
        ws_client: WebSocketTestSession,
        example_file: Path,
        test_user_vault_folder: Path,
    ):
        # Upload a file
        uuid = uuid4().hex
        file_name = f"test-{uuid}.txt.exef"
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/{file_name}", content=f)
        assert response.status_code == 201
        uploaded_file = test_user_vault_folder / file_name
        assert uploaded_file.exists()

        # Rename file should work
        new_file_name = f"test-{uuid4().hex}.txt.exef"
        response = auth_client.post(f"/api/files/rename/{file_name}", json=new_file_name)
        assert response.status_code == 200

        # Check if the updates was transmitted
        assert ws_client.receive_text() == "."  # Once for creation...
        assert ws_client.receive_text() == "."  # ...once for update

    def test_encrypted(
        self, auth_client: TestClient, ws_client_encrypted: WebSocketTestSession, test_user_vault_folder: Path
    ):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

        # Check if the update was transmitted
        enc_data = ws_client_encrypted.receive_bytes()
        assert enc_data

        # Check received path
        path = ExEF(b"one demo 16B key").decrypt(enc_data)
        assert path.decode("utf-8") == "."

    def test_multi_connection(
        self,
        auth_client: TestClient,
        ws_client: WebSocketTestSession,
        ws_client_encrypted: WebSocketTestSession,
        test_user_vault_folder: Path,
    ):
        # Create a folder
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

        # Check if the updates were transmitted
        assert ws_client.receive_text() == "."
        assert ExEF(b"one demo 16B key").decrypt(ws_client_encrypted.receive_bytes()).decode("utf-8") == "."
