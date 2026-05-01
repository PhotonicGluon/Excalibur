import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


class TestMove:
    @pytest.fixture()
    def move_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        containing_folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="move-folder",
            is_folder=True,
            fullpath="move-folder",
        )
        db_session.add(containing_folder)

        # Create a folder that we can move items into
        move_folder = FSItem(
            parent_id=containing_folder.id,
            root_id=root_id,
            name="move-into",
            is_folder=True,
            fullpath="move-folder/move-into",
        )
        db_session.add(move_folder)

        # Commit and yield only the containing folder
        db_session.commit()
        yield containing_folder

        # Clean up
        if get_item(containing_folder.id) is not None:
            db_session.delete(move_folder)
            db_session.delete(containing_folder)
            db_session.commit()

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/move/m-file", json="move-folder/move-into")
        assert response.status_code == 401

    def test_move(self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file",
            is_folder=False,
            fullpath="move-folder/m-file",
        )
        db_session.add(file)
        db_session.commit()

        # Move item into folder
        response = auth_client_db.post(
            f"/api/files/move/{get_item_fullpath(file.id).as_posix()}", json="move-folder/move-into"
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content).decode("UTF-8")
        assert get_item_fullpath(file.id).as_posix() == "move-folder/move-into/m-file"

    def test_move_into_root(self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file-root",
            is_folder=False,
            fullpath="move-folder/m-file-root",
        )
        db_session.add(file)
        db_session.commit()

        # Move item into root
        response = auth_client_db.post(f"/api/files/move/{get_item_fullpath(file.id).as_posix()}", json=".")
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content).decode("UTF-8")
        assert get_item_fullpath(file.id).as_posix() == "m-file-root"

    def test_move_with_encrypted_path(
        self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem
    ):
        from base64 import b64encode

        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file-enc",
            is_folder=False,
            fullpath="move-folder/m-file-enc",
        )
        db_session.add(file)
        db_session.commit()

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        path_encrypted = ExEF(b"one demo 16B key").encrypt(get_item_fullpath(file.id).as_posix().encode("utf-8"))
        destination_encrypted = ExEF(b"one demo 16B key").encrypt(b"move-folder/move-into")

        # Make request
        response = auth_client_db.post(
            f"/api/files/move/{b64encode(path_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=destination_encrypted,
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content).decode("UTF-8")
        assert get_item_fullpath(file.id).as_posix() == "move-folder/move-into/m-file-enc"

    def test_move_nonexistent(self, auth_client_db: TestClient):
        response = auth_client_db.post("/api/files/move/does-not-exist", json="move-folder/move-into")
        assert response.status_code == 404

    def test_dest_same_as_current(
        self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem
    ):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file-same-as-current",
            is_folder=False,
            fullpath="move-folder/m-file-same-as-current",
        )
        db_session.add(file)
        db_session.commit()

        response = auth_client_db.post(f"/api/files/move/{get_item_fullpath(file.id).as_posix()}", json="move-folder")
        assert response.status_code == 409  # Item already exists

    def test_already_exists(self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test files
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file-already-exists",
            is_folder=False,
            fullpath="move-folder/m-file-already-exists",
        )
        existing_file = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="m-file-already-exists",
            is_folder=False,
            fullpath="m-file-already-exists",
        )
        db_session.add(file)
        db_session.add(existing_file)
        db_session.commit()

        response = auth_client_db.post(f"/api/files/move/{get_item_fullpath(file.id).as_posix()}", json=".")
        assert response.status_code == 409  # Item already exists

    def test_destination_nonexistent(
        self, auth_client_db: TestClient, test_user, db_session: Session, move_folder: FSItem
    ):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=move_folder.id,
            root_id=root_id,
            name="m-file-dest-dne",
            is_folder=False,
            fullpath="move-folder/m-file-dest-dne",
        )
        db_session.add(file)
        db_session.commit()

        response = auth_client_db.post(f"/api/files/move/{get_item_fullpath(file.id).as_posix()}", json="fake-folder")
        assert response.status_code == 404  # Destination not found

    def test_move_root(self, auth_client_db: TestClient):
        response = auth_client_db.post("/api/files/move/.", json="new-name")
        assert response.status_code == 412  # Cannot move root
