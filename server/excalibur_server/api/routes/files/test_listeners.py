import time
from pathlib import Path
from urllib.parse import quote_plus
from uuid import uuid4

import pytest
from Crypto.Random import get_random_bytes
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketTestSession

from excalibur_server.src.auth.pop import generate_pop_header
from excalibur_server.src.exef import ExEF


class TestDirectoryChangesListener:
    @pytest.fixture(scope="class")
    def auth_token(self, auth_client: TestClient):
        return auth_client.headers["Authorization"].removeprefix("Bearer ")

    @pytest.fixture
    def ws_client(self, auth_client: TestClient, auth_token: str):
        pop_header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="WEBSOCKET",
            path="/api/files/listen",
            timestamp=int(time.time()),
            nonce=get_random_bytes(16),
        )

        with auth_client.websocket_connect(
            f"/api/files/listen?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted=false"
        ) as ws:
            yield ws

    @pytest.fixture(scope="class")
    def example_file(self, tmp_path_factory: pytest.TempPathFactory) -> Path:
        file = tmp_path_factory.mktemp("test") / "test.txt.exef"

        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file.write_bytes(encrypted_data)
        yield file
        file.unlink()

    def test_connect(self, ws_client: WebSocketTestSession):
        assert ws_client, "Failed to connect to the WebSocket"

    def test_encrypted(self, auth_client: TestClient, test_user_vault_folder: Path, auth_token: str):
        from base64 import b64decode

        from Crypto.Cipher import AES

        pop_header = generate_pop_header(
            master_key=b"one demo 16B key",
            method="WEBSOCKET",
            path="/api/files/listen",
            timestamp=int(time.time()),
            nonce=get_random_bytes(16),
        )

        with auth_client.websocket_connect(
            f"/api/files/listen?auth_token={auth_token}&hmac_validation={quote_plus(pop_header)}&encrypted=true"
        ) as ws:
            # Create a folder
            uuid = uuid4().hex
            response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
            assert response.status_code == 201
            assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

            # Check if the update was transmitted
            enc_data = ws.receive_json()
            assert enc_data

            # Check received path
            cipher = AES.new(
                b"one demo 16B key",
                AES.MODE_GCM,
                nonce=b64decode(enc_data["nonce"]),
            )
            path = cipher.decrypt(b64decode(enc_data["path"]))
            cipher.verify(b64decode(enc_data["tag"]))
            assert path.decode("utf-8") == "."

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
            response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.txt.exef", content=f)
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
            response = auth_client.post(f"/api/files/upload/{subdir}?name=test-{uuid}.txt.exef", content=f)
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
            response = auth_client.post(f"/api/files/upload/.?name={file_name}", content=f)
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
            response = auth_client.post(f"/api/files/upload/.?name={file_name}", content=f)
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
