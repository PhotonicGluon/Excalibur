from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_items_in_folder
from excalibur_server.src.db.tables import FSItem


def _get_child(parent_id, name: str) -> FSItem | None:
    return next((item for item in get_items_in_folder(parent_id) if item.name == name), None)


class TestUpload:
    def test_no_auth(self):
        response = TestClient(app).post(f"/api/files/upload/{uuid4()}/fake.exef", content=b"Fake content")
        assert response.status_code == 401

    def test_upload(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        content = b"No transit encryption content"

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/{root_id}/test-{uuid}.txt.exef", content=content)
        assert response.status_code == 201

        item = _get_child(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_upload_to_subdirectory(self, test_user, auth_client: TestClient, db_session: Session):
        root_id = test_user["root_id"]
        uuid = uuid4().hex

        folder = FSItem(parent_id=root_id, root_id=root_id, name=f"upload-dir-{uuid}", is_folder=True)
        db_session.add(folder)
        db_session.commit()

        response = auth_client.post(f"/api/files/upload/{folder.id}/test.txt.exef", content=b"content")
        assert response.status_code == 201
        assert _get_child(folder.id, "test.txt.exef") is not None
        assert _get_child(root_id, "test.txt.exef") is None

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
        parent_encrypted = ExEF(b"one demo 16B key").encrypt(b".")
        name_encrypted = ExEF(b"one demo 16B key").encrypt(f"test-{uuid}.txt.exef".encode())
        response = auth_client.post(
            f"/api/files/upload/{b64encode(parent_encrypted, altchars=b'-_').decode()}"
            f"/{b64encode(name_encrypted, altchars=b'-_').decode()}",
            headers=headers,
            content=transit_encrypted_data,
        )
        assert response.status_code == 201

        item = _get_child(root_id, f"test-{uuid}.txt.exef")
        assert item is not None

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_file_already_exists(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        uuid = uuid4().hex

        # Initial upload should be OK
        response = auth_client.post(f"/api/files/upload/{root_id}/test-{uuid}.txt.exef", content=b"first")
        assert response.status_code == 201

        item = _get_child(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again without `force` should fail
        response = auth_client.post(f"/api/files/upload/{root_id}/test-{uuid}.txt.exef", content=b"second")
        assert response.status_code == 409
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again with `force` should succeed
        response = auth_client.post(f"/api/files/upload/{root_id}/test-{uuid}.txt.exef?force=true", content=b"third")
        assert response.status_code == 201
        assert not uploaded_file.exists()  # Path changed because we gave a new uploaded item

        item = _get_child(root_id, f"test-{uuid}.txt.exef")
        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"third"

    def test_parent_not_found(self, auth_client: TestClient):
        uuid = uuid4().hex
        response = auth_client.post(
            f"/api/files/upload/{uuid4()}/test-{uuid}.txt.exef", content=b"fake parent test content"
        )
        assert response.status_code == 404

    def test_parent_is_not_a_directory(self, test_user, auth_client: TestClient, db_session: Session):
        root_id = test_user["root_id"]
        file = FSItem(parent_id=root_id, root_id=root_id, name=f"file-{uuid4().hex}.exef", size=0)
        db_session.add(file)
        db_session.commit()

        response = auth_client.post(f"/api/files/upload/{file.id}/test.txt.exef", content=b"content")
        assert response.status_code == 404

    def test_illegal_name(self, test_user, auth_client: TestClient):
        from base64 import b64encode

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        parent_encrypted = ExEF(b"one demo 16B key").encrypt(b".")
        name_encrypted = ExEF(b"one demo 16B key").encrypt(b"a/b.txt.exef")
        response = auth_client.post(
            f"/api/files/upload/{b64encode(parent_encrypted, altchars=b'-_').decode()}"
            f"/{b64encode(name_encrypted, altchars=b'-_').decode()}",
            headers=headers,
            content=ExEF(b"one demo 16B key").encrypt(b"content"),
        )
        assert response.status_code == 400

    def test_missing_exef_extension(self, test_user, auth_client: TestClient):
        response = auth_client.post(f"/api/files/upload/{test_user['root_id']}/no-extension.txt", content=b"x")
        assert response.status_code == 417


class TestUploadMerkleEffects:
    def test_upload_returns_new_file_id(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/{root_id}/merkle-{uuid}.txt.exef", content=b"content")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id == str(_get_child(root_id, f"merkle-{uuid}.txt.exef").id)

    def test_upload_marks_ancestors_dirty(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        mark_clean(root_id)
        root_version = get_item(root_id).version

        uuid = uuid4().hex
        response = auth_client.post(f"/api/files/upload/{root_id}/merkle-{uuid}.txt.exef", content=b"content")
        assert response.status_code == 201

        # The new file starts out dirty, and its parent chain is dirtied along with it
        new_file = _get_child(root_id, f"merkle-{uuid}.txt.exef")
        assert new_file.node_hash is None
        assert new_file.content_mac is None
        assert_dirty(root_id, root_version)

    def test_forced_upload_returns_the_new_id(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        auth_client.post(f"/api/files/upload/{root_id}/merkle-{uuid}.txt.exef", content=b"first")
        original_id = _get_child(root_id, f"merkle-{uuid}.txt.exef").id

        mark_clean(original_id)
        root_version = get_item(root_id).version

        # Overwriting deletes and recreates the row, so the ID the client gets back is a new one
        response = auth_client.post(f"/api/files/upload/{root_id}/merkle-{uuid}.txt.exef?force=true", content=b"second")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id != str(original_id)
        assert returned_id == str(_get_child(root_id, f"merkle-{uuid}.txt.exef").id)
        assert_dirty(root_id, root_version)
