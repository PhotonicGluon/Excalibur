from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_items_in_folder
from excalibur_server.src.db.tables import FSItem


class TestCreateDir:
    def test_no_auth(self):
        uuid = uuid4().hex
        response = TestClient(app).post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 401

    def test_create_directory_no_transit_encryption(self, auth_client: TestClient, test_user):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert any(item.name == f"test-dir-{uuid}" for item in get_items_in_folder(root_id))

    def test_create_directory_transit_encryption(self, auth_client: TestClient, test_user):
        from base64 import b64encode

        root_id = test_user["root_id"]

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(b".")
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(f"test-dir-{uuid}".encode())
        response = auth_client.post(
            f"/api/files/mkdir/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers=headers,
            content=transit_encrypted_data,
        )

        assert response.status_code == 201
        assert any(item.name == f"test-dir-{uuid}" for item in get_items_in_folder(root_id))

    def test_illegal_name(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/.", json="illegal/dir/name")
        assert response.status_code == 400

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/fake/path", json="test-dir")
        assert response.status_code == 404

    def test_directory_already_exists(self, auth_client: TestClient, test_user, db_session: Session):
        root_id = test_user["root_id"]
        uuid = uuid4().hex

        # Create a pre-existing folder
        move_folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name=f"test-dir-{uuid}",
            is_folder=True,
        )
        db_session.add(move_folder)
        db_session.commit()

        # Then send the folder creation request
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 409


class TestCreateDirMerkleEffects:
    def test_mkdir_returns_new_folder_id(self, auth_client: TestClient, test_user):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"merkle-dir-{uuid}")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        new_folder = next(item for item in get_items_in_folder(root_id) if item.name == f"merkle-dir-{uuid}")
        assert returned_id == str(new_folder.id)

    def test_mkdir_marks_ancestors_dirty(self, auth_client: TestClient, test_user, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        mark_clean(root_id)
        root_version = get_item(root_id).version

        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"merkle-dir-{uuid}")
        assert response.status_code == 201

        new_folder = next(item for item in get_items_in_folder(root_id) if item.name == f"merkle-dir-{uuid}")
        assert new_folder.node_hash is None
        assert_dirty(root_id, root_version)
