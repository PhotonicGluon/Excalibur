from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item_by_path
from excalibur_server.src.exef import ExEF


class TestUpload:
    def test_no_auth(self):
        response = TestClient(app).post("/api/files/upload/.", content=b"Fake content")
        assert response.status_code == 401

    def test_upload(self, test_user, auth_client_db: TestClient, test_user_db_vault_folder: Path):
        root_id = test_user["root_id"]
        content = b"No transit encryption content"

        uuid = uuid4().hex
        response = auth_client_db.post(f"/api/files/upload/test-{uuid}.txt.exef", content=content)
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = test_user_db_vault_folder / f"{item.id}.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_upload_transit_encryption(self, test_user, auth_client_db: TestClient, test_user_db_vault_folder: Path):
        from base64 import b64encode

        root_id = test_user["root_id"]
        content = b"Transit encryption content"

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex

        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(content)
        file_path_encrypted = ExEF(b"one demo 16B key").encrypt(f"./test-{uuid}.txt.exef".encode("utf-8"))
        response = auth_client_db.post(
            f"/api/files/upload/{b64encode(file_path_encrypted, altchars=b'-_').decode()}",
            headers=headers,
            content=transit_encrypted_data,
        )
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = test_user_db_vault_folder / f"{item.id}.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_file_already_exists(self, test_user, auth_client_db: TestClient, test_user_db_vault_folder: Path):
        root_id = test_user["root_id"]

        uuid = uuid4().hex

        # Initial upload should be OK
        response = auth_client_db.post(f"/api/files/upload/test-{uuid}.txt.exef", content=b"first")
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = test_user_db_vault_folder / f"{item.id}.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again without `force` should fail
        response = auth_client_db.post(f"/api/files/upload/./test-{uuid}.txt.exef", content=b"second")
        assert response.status_code == 409
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again with `force` should succeed
        response = auth_client_db.post(f"/api/files/upload/./test-{uuid}.txt.exef?force=true", content=b"third")
        assert response.status_code == 201
        assert not uploaded_file.exists()  # Path changed because we gave a new uploaded item

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = test_user_db_vault_folder / f"{item.id}.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"third"

    def test_path_not_found(self, auth_client_db: TestClient):
        uuid = uuid4().hex
        response = auth_client_db.post(
            f"/api/files/upload/fake/path/test-{uuid}.txt.exef", content=b"fake path test content"
        )
        assert response.status_code == 404
