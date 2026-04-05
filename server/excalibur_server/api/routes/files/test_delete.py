import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


class TestDeletePath:
    @pytest.fixture
    def deletable_file(self, test_user, test_user_db_vault_folder: Path, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        file_id = uuid4()
        file_path = test_user_db_vault_folder / f"{file_id}.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        size = file_path.write_bytes(encrypted_data)

        file = FSItem(
            id=file_id,
            parent_id=root_id,
            root_id=root_id,
            name="test-delete.txt.exef",
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

    @pytest.fixture
    def deletable_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="test-delete",
            is_folder=True,
        )
        db_session.add(folder)
        db_session.commit()

        yield folder

        if get_item(folder.id) is not None:
            db_session.delete(folder)
            db_session.commit()

    @pytest.fixture
    def deletable_folder_with_items(
        self, test_user, test_user_db_vault_folder: Path, db_session: Session
    ) -> tuple[FSItem, list[FSItem]]:
        root_id = test_user["root_id"]

        # Make containing folder
        folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="test-delete-2",
            is_folder=True,
        )
        db_session.add(folder)

        # Make test files
        file1_id = uuid4()
        file1_path = test_user_db_vault_folder / f"{file1_id}.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        size = file1_path.write_bytes(encrypted_data)
        file1 = FSItem(
            id=file1_id,
            parent_id=folder.id,
            root_id=root_id,
            name="test-delete.txt.exef",
            is_folder=False,
            size=size,
            mimetype="text/plain",
        )
        db_session.add(file1)

        file2_id = uuid4()
        file2_path = test_user_db_vault_folder / f"{file2_id}.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        size = file2_path.write_bytes(encrypted_data)
        file2 = FSItem(
            id=file2_id,
            parent_id=folder.id,
            root_id=root_id,
            name="test-delete2.txt.exef",
            is_folder=False,
            size=size,
            mimetype="text/plain",
        )
        db_session.add(file2)

        # Commit and yield
        db_session.commit()
        yield (folder, [file1, file2])

        # Clean up
        if get_item(folder.id) is not None:
            db_session.delete(file1)
            db_session.delete(file2)
            db_session.delete(folder)
            db_session.commit()

        if file1_path.exists():
            file1_path.unlink()
        if file2_path.exists():
            file2_path.unlink()

    def test_no_auth(self, deletable_file: FSItem):
        response = TestClient(app).delete(f"/api/files/delete/{deletable_file}")
        assert response.status_code == 401

    def test_delete_file(self, auth_client_db: TestClient, test_user_db_vault_folder: Path, deletable_file: FSItem):
        # Ensure items exist before deletion
        assert get_item(deletable_file.id) is not None
        assert (test_user_db_vault_folder / f"{deletable_file.id}.exef").exists()

        response = auth_client_db.delete(f"/api/files/delete/{get_item_fullpath(deletable_file.id)}")
        assert response.status_code == 200
        assert get_item(deletable_file.id) is None
        assert not (test_user_db_vault_folder / f"{deletable_file.id}.exef").exists()

    def test_delete_folder(self, auth_client_db: TestClient, deletable_folder: FSItem):
        path = get_item_fullpath(deletable_folder.id)

        # Not specifying `as_dir` should fail
        response = auth_client_db.delete(f"/api/files/delete/{path}")
        assert response.status_code == 400
        assert get_item(deletable_folder.id) is not None

        # Specifying `as_dir` should work
        response = auth_client_db.delete(f"/api/files/delete/{path}?as_dir=true")
        assert response.status_code == 202
        assert get_item(deletable_folder.id) is None

    def test_delete_folder_with_items(
        self,
        auth_client_db: TestClient,
        test_user_db_vault_folder: Path,
        deletable_folder_with_items: tuple[FSItem, list[FSItem]],
    ):
        folder, files = deletable_folder_with_items
        path = get_item_fullpath(folder.id)

        # Not specifying `as_dir` should fail
        response = auth_client_db.delete(f"/api/files/delete/{path}")
        assert response.status_code == 400

        assert get_item(folder.id) is not None
        for file in files:
            assert get_item(file.id) is not None
            assert (test_user_db_vault_folder / f"{file.id}.exef").exists()

        # Not specifying `force` should fail
        response = auth_client_db.delete(f"/api/files/delete/{path}?as_dir=true")
        assert response.status_code == 417

        assert get_item(folder.id) is not None
        for file in files:
            assert get_item(file.id) is not None
            assert (test_user_db_vault_folder / f"{file.id}.exef").exists()

        # Specifying `force` should work
        response = auth_client_db.delete(f"/api/files/delete/{path}?as_dir=true&force=true")
        assert response.status_code == 202

        assert get_item(folder.id) is None
        for file in files:
            assert get_item(file.id) is None
            assert not (test_user_db_vault_folder / f"{file.id}.exef").exists()

    def test_delete_with_encrypted_path(
        self, auth_client_db: TestClient, test_user_db_vault_folder: Path, deletable_file: FSItem
    ):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(
            get_item_fullpath(deletable_file.id).as_posix().encode("UTF-8")
        )
        response = auth_client_db.delete(
            f"/api/files/delete/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200
        assert get_item(deletable_file.id) is None
        assert not (test_user_db_vault_folder / f"{deletable_file.id}.exef").exists()

    def test_path_not_found(self, auth_client_db: TestClient):
        response = auth_client_db.delete("/api/files/delete/fake/path")
        assert response.status_code == 404

    def test_delete_root(self, auth_client_db: TestClient):
        response = auth_client_db.delete("/api/files/delete/.")
        assert response.status_code == 412


# Legacy tests (without database filesystem)
class TestDeletePathOld:
    # Fixtures
    @pytest.fixture
    def deletable_file(self, test_user_vault_folder: Path) -> Path:
        file = test_user_vault_folder / "test-delete.txt.exef"
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file.write_bytes(encrypted_data)

        yield file

        if file.exists():
            file.unlink()

    @pytest.fixture
    def deletable_folder(self, test_user_vault_folder: Path) -> Path:
        folder = test_user_vault_folder / "test-delete"
        folder.mkdir()

        yield folder

        if folder.exists():
            shutil.rmtree(folder)

    @pytest.fixture
    def deletable_folder_with_items(self, test_user_vault_folder: Path) -> Path:
        folder = test_user_vault_folder / "test-delete-2"
        folder.mkdir()
        (folder / "test-delete.txt.exef").write_bytes(ExEF(b"one demo 16B key").encrypt(b"test"))
        (folder / "test-delete2.txt.exef").write_bytes(ExEF(b"one demo 16B key").encrypt(b"test"))

        yield folder
        if folder.exists():
            shutil.rmtree(folder)

    # Tests
    def test_no_auth(self, deletable_file: Path):
        response = TestClient(app).delete(f"/api/files/delete/{deletable_file}")
        assert response.status_code == 401

    def test_delete_file(self, auth_client: TestClient, deletable_file: Path):
        response = auth_client.delete(f"/api/files/delete/{deletable_file}")
        assert response.status_code == 200
        assert not deletable_file.exists()

    def test_delete_folder(self, auth_client: TestClient, deletable_folder: Path):
        # Not specifying `as_dir` should fail
        response = auth_client.delete(f"/api/files/delete/{deletable_folder}")
        assert response.status_code == 400
        assert deletable_folder.exists()

        # Specifying `as_dir` should work
        response = auth_client.delete(f"/api/files/delete/{deletable_folder}?as_dir=true")
        assert response.status_code == 202
        assert not deletable_folder.exists()

    def test_delete_folder_with_items(self, auth_client: TestClient, deletable_folder_with_items: Path):
        # Not specifying `as_dir` should fail
        response = auth_client.delete(f"/api/files/delete/{deletable_folder_with_items}")
        assert response.status_code == 400

        # Not specifying `force` should fail
        response = auth_client.delete(f"/api/files/delete/{deletable_folder_with_items}?as_dir=true")
        assert response.status_code == 417

        # Specifying `force` should work
        response = auth_client.delete(f"/api/files/delete/{deletable_folder_with_items}?as_dir=true&force=true")
        assert response.status_code == 202
        assert not deletable_folder_with_items.exists()

    def test_delete_with_encrypted_path(self, auth_client: TestClient, deletable_file: Path):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"test-delete.txt.exef")
        response = auth_client.delete(
            f"/api/files/delete/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200
        assert not deletable_file.exists()

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/fake/path")
        assert response.status_code == 404

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/%2E%2E/oops")
        assert response.status_code == 406

    def test_delete_root(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/.")
        assert response.status_code == 412
