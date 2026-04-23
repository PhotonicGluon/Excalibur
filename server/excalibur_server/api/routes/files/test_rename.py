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
            fullpath="rename-folder",
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
            fullpath="rename-folder/r-file",
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
            fullpath="rename-folder/r-file-enc",
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

    def test_rename_nested_item(
        self, auth_client_db: TestClient, test_user, db_session: Session, rename_folder: FSItem
    ):
        root_id = test_user["root_id"]

        folder = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="nested-folder",
            is_folder=True,
            fullpath="rename-folder/nested-folder",
        )
        file = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="file",
            is_folder=False,
            fullpath="rename-folder/nested-folder/file",
        )
        db_session.add(folder)
        db_session.add(file)
        db_session.commit()

        # Rename the folder
        response = auth_client_db.post(
            f"/api/files/rename/{get_item_fullpath(folder.id).as_posix()}", json="changed-folder-name"
        )
        assert response.status_code == 200
        assert get_item(folder.id).fullpath == "rename-folder/changed-folder-name"

        # Check the processing of the fullpath of the file
        assert get_item(file.id).fullpath == "rename-folder/nested-folder/file"  # Should not have changed

        new_fullpath = get_item_fullpath(file.id)  # Forces refresh of fullpath
        assert new_fullpath.as_posix() == "rename-folder/changed-folder-name/file"
        assert get_item(file.id).fullpath == "rename-folder/changed-folder-name/file"

    def test_illegal_name(self, auth_client_db: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=test_user["root_id"],
            name="r-file-illegal-name",
            is_folder=False,
            fullpath="rename-folder/r-file-illegal-name",
        )
        db_session.add(file)
        db_session.commit()

        response = auth_client_db.post("/api/files/rename/rename-folder/r-file-illegal-name", json="illegal/item/name")
        assert response.status_code == 400

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
            fullpath="rename-folder/r-file-already-exists",
        )
        existing_file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="already-existent",
            is_folder=False,
            fullpath="rename-folder/already-existent",
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
