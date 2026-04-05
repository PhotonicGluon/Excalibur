from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_items_in_folder
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


class TestCreateDir:
    def test_no_auth(self):
        uuid = uuid4().hex
        response = TestClient(app).post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 401

    def test_create_directory_no_transit_encryption(self, auth_client_db: TestClient, test_user):
        root_id = test_user["root_id"]

        uuid = uuid4().hex
        response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert any(item.name == f"test-dir-{uuid}" for item in get_items_in_folder(root_id))

    def test_create_directory_transit_encryption(self, auth_client_db: TestClient, test_user):
        from base64 import b64encode

        root_id = test_user["root_id"]

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(".".encode("UTF-8"))
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(f"test-dir-{uuid}".encode("UTF-8"))
        response = auth_client_db.post(
            f"/api/files/mkdir/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers=headers,
            content=transit_encrypted_data,
        )

        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert any(item.name == f"test-dir-{uuid}" for item in get_items_in_folder(root_id))

    def test_path_not_found(self, auth_client_db: TestClient):
        response = auth_client_db.post("/api/files/mkdir/fake/path", json="test-dir")
        assert response.status_code == 404

    def test_directory_already_exists(self, auth_client_db: TestClient, test_user, db_session: Session):
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
        response = auth_client_db.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 409


# Legacy tests (without database filesystem)
class TestCreateDirOld:
    def test_no_auth(self):
        uuid = uuid4().hex
        response = TestClient(app).post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 401

    def test_create_directory_no_transit_encryption(self, auth_client: TestClient, test_user_vault_folder: Path):
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

    def test_create_directory_transit_encryption(self, auth_client: TestClient, test_user_vault_folder: Path):
        from base64 import b64encode

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(".".encode("UTF-8"))
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(f"test-dir-{uuid}".encode("UTF-8"))
        response = auth_client.post(
            f"/api/files/mkdir/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers=headers,
            content=transit_encrypted_data,
        )

        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/fake/path", json="test-dir")
        assert response.status_code == 404

    def test_path_too_long(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/.", json="test-" + "a" * 1000)
        assert response.status_code == 414

    def test_path_traversal(self, auth_client: TestClient):
        # Path is invalid
        response = auth_client.post("/api/files/mkdir/%2E%2E", json="test-dir")
        assert response.status_code == 406

        # Directory name is invalid
        response = auth_client.post("/api/files/mkdir/.", json="../fake-dir")
        assert response.status_code == 406

    def test_directory_already_exists(self, auth_client: TestClient, test_user_vault_folder: Path):
        uuid = uuid4().hex
        (test_user_vault_folder / f"test-dir-{uuid}").mkdir()
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 409
