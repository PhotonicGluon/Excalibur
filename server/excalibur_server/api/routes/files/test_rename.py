import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


class TestRename:
    @pytest.fixture
    def rename_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        rename_folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="rename-folder",
            is_folder=True,
        )
        db_session.add(rename_folder)

        # Commit and yield only the containing folder
        db_session.commit()
        yield rename_folder

        # Clean up
        if get_item(rename_folder.id) is not None:
            db_session.delete(rename_folder)
            db_session.commit()

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/rename/r-file", json="new-name")
        assert response.status_code == 401

    def test_rename(self, auth_client_db: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        # Rename the item
        response = auth_client_db.post(f"/api/files/rename/{get_item_fullpath(file.id).as_posix()}", json="new-name")
        assert response.status_code == 200
        assert get_item(file.id).name == "new-name"

    def test_rename_with_encrypted_path(
        self, auth_client_db: TestClient, test_user, db_session: Session, rename_folder: FSItem
    ):
        from base64 import b64encode

        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file-enc",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"rename-folder/r-file-enc")
        destination_encrypted = ExEF(b"one demo 16B key").encrypt(b"new-name-enc")

        # Make request
        response = auth_client_db.post(
            f"/api/files/rename/{b64encode(path_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=destination_encrypted,
        )

        assert response.status_code == 200
        assert get_item(file.id).name == "new-name-enc"

    def test_rename_nonexistent(self, auth_client_db: TestClient):
        response = auth_client_db.post("/api/files/rename/does-not-exist", json="new-name")
        assert response.status_code == 404

    def test_already_exists(self, auth_client_db: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test files
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file-already-exists",
            is_folder=False,
        )
        existing_file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="already-existent",
            is_folder=False,
        )
        db_session.add(file)
        db_session.add(existing_file)
        db_session.commit()

        # Try to rename file to existing name
        response = auth_client_db.post(
            f"/api/files/rename/{get_item_fullpath(file.id).as_posix()}", json="already-existent"
        )
        assert response.status_code == 409  # Item already exists

    def test_rename_root(self, auth_client_db: TestClient):
        response = auth_client_db.post("/api/files/rename/.", json="new-name")
        assert response.status_code == 412  # Cannot rename root


# Legacy tests (without database filesystem)
class TestRenameOld:
    @pytest.fixture
    def rename_folder(self, test_user_vault_folder: Path):
        r_folder = test_user_vault_folder / "rename-folder"
        r_folder.mkdir()
        yield r_folder
        shutil.rmtree(r_folder)

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/rename/r-file", json="new-name")
        assert response.status_code == 401

    def test_rename(self, auth_client: TestClient, rename_folder: Path):
        # Rename file should work
        (rename_folder / "r-file").touch()
        response = auth_client.post("/api/files/rename/rename-folder/r-file", json="new-name")
        assert response.status_code == 200
        assert not (rename_folder / "r-file").exists()
        assert (rename_folder / "new-name").exists()

        # Rename folder should work
        (rename_folder / "r-folder").mkdir()
        response = auth_client.post("/api/files/rename/rename-folder/r-folder", json="another-name")
        assert response.status_code == 200
        assert not (rename_folder / "r-folder").exists()
        assert (rename_folder / "another-name").exists()

        response = auth_client.post("/api/files/rename/does-not-exist", json="new-name")
        assert response.status_code == 404

    def test_rename_with_encrypted_path(self, auth_client: TestClient, rename_folder: Path):
        from base64 import b64encode

        (rename_folder / "r-file").touch()

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"rename-folder/r-file")
        destination_encrypted = ExEF(b"one demo 16B key").encrypt(b"new-name")
        response = auth_client.post(
            f"/api/files/rename/{b64encode(path_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=destination_encrypted,
        )

        assert response.status_code == 200
        assert not (rename_folder / "r-file").exists()
        assert (rename_folder / "new-name").exists()

    def test_path_traversal(self, auth_client: TestClient, rename_folder: Path):
        # Initial access path traversal should fail
        response = auth_client.post("/api/files/rename/%2E%2E/oh-no", json="new-name")  # %2E%2E = ..
        assert response.status_code == 406

        # Renamed path traversal should fail
        (rename_folder / "r-file").touch()
        response = auth_client.post("/api/files/rename/rename-folder/r-file", json="../../oh-no")
        assert response.status_code == 406

    def test_already_exists(self, auth_client: TestClient, rename_folder: Path):
        (rename_folder / "r-file").touch()
        response = auth_client.post("/api/files/rename/rename-folder/r-file", json="r-file")
        assert response.status_code == 409  # Item already exists

    def test_rename_root(self, auth_client: TestClient):
        response = auth_client.post("/api/files/rename/.", json="new-name")
        assert response.status_code == 412  # Cannot rename root

    def test_rename_too_long(self, auth_client: TestClient, rename_folder: Path):
        (rename_folder / "r-file").touch()
        response = auth_client.post("/api/files/rename/rename-folder/r-file", json="" + "a" * 10000)
        assert response.status_code == 414  # Path too long
