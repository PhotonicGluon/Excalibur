from uuid import uuid4

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_item_by_path


class TestUpload:
    def test_no_auth(self):
        response = TestClient(app).post("/api/files/upload/.", content=b"Fake content")
        assert response.status_code == 401

    def test_upload(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        content = b"No transit encryption content"

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/test-{uuid}.txt.exef", content=content)
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_upload_transit_encryption(self, test_user, auth_client: TestClient):
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
        file_path_encrypted = ExEF(b"one demo 16B key").encrypt(f"./test-{uuid}.txt.exef".encode())
        response = auth_client.post(
            f"/api/files/upload/{b64encode(file_path_encrypted, altchars=b'-_').decode()}",
            headers=headers,
            content=transit_encrypted_data,
        )
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_file_already_exists(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        uuid = uuid4().hex

        # Initial upload should be OK
        response = auth_client.post(f"/api/files/upload/test-{uuid}.txt.exef", content=b"first")
        assert response.status_code == 201

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again without `force` should fail
        response = auth_client.post(f"/api/files/upload/./test-{uuid}.txt.exef", content=b"second")
        assert response.status_code == 409
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again with `force` should succeed
        response = auth_client.post(f"/api/files/upload/./test-{uuid}.txt.exef?force=true", content=b"third")
        assert response.status_code == 201
        assert not uploaded_file.exists()  # Path changed because we gave a new uploaded item

        item = get_item_by_path(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"third"

    def test_path_not_found(self, auth_client: TestClient):
        uuid = uuid4().hex
        response = auth_client.post(
            f"/api/files/upload/fake/path/test-{uuid}.txt.exef", content=b"fake path test content"
        )
        assert response.status_code == 404


class TestUploadMerkleEffects:
    def test_upload_returns_new_file_id(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/merkle-{uuid}.txt.exef", content=b"content")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id == str(get_item_by_path(root_id, f"merkle-{uuid}.txt.exef").id)

    def test_upload_marks_ancestors_dirty(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        mark_clean(root_id)
        root_version = get_item(root_id).version

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/merkle-{uuid}.txt.exef", content=b"content")
        assert response.status_code == 201

        # The new file starts out dirty, and its parent chain is dirtied along with it
        new_file = get_item_by_path(root_id, f"merkle-{uuid}.txt.exef")
        assert new_file.node_hash is None
        assert new_file.content_mac is None
        assert_dirty(root_id, root_version)

    def test_forced_upload_returns_the_new_id(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        auth_client.post(f"/api/files/upload/merkle-{uuid}.txt.exef", content=b"first")
        original_id = get_item_by_path(root_id, f"merkle-{uuid}.txt.exef").id

        mark_clean(original_id)
        root_version = get_item(root_id).version

        # Overwriting deletes and recreates the row, so the ID the client gets back is a new one
        response = auth_client.post(f"/api/files/upload/merkle-{uuid}.txt.exef?force=true", content=b"second")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id != str(original_id)
        assert returned_id == str(get_item_by_path(root_id, f"merkle-{uuid}.txt.exef").id)
        assert_dirty(root_id, root_version)
