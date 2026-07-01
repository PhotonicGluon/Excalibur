import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem


class TestDeletePath:
    @pytest.fixture
    def deletable_file(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        file = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="test-delete.txt.exef",
            is_folder=False,
        )
        file_path = CONFIG.storage.vault_folder / file.system_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file.size = file_path.write_bytes(encrypted_data)

        db_session.add(file)
        db_session.commit()

        yield file

        if get_item(file.id) is not None:
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
    def deletable_folder_with_items(self, test_user, db_session: Session) -> tuple[FSItem, list[FSItem]]:
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
        file1 = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="test-delete.txt.exef",
            is_folder=False,
        )
        file1_path = CONFIG.storage.vault_folder / file1.system_path
        file1_path.parent.mkdir(parents=True, exist_ok=True)
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file1.size = file1_path.write_bytes(encrypted_data)

        db_session.add(file1)

        file2 = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="test-delete2.txt.exef",
            is_folder=False,
        )
        file2_path = CONFIG.storage.vault_folder / file2.system_path
        file2_path.parent.mkdir(parents=True, exist_ok=True)
        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file2.size = file2_path.write_bytes(encrypted_data)
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

    def test_delete_file(self, auth_client: TestClient, deletable_file: FSItem):
        # Ensure items exist before deletion
        assert get_item(deletable_file.id) is not None
        assert (CONFIG.storage.vault_folder / deletable_file.system_path).exists()

        response = auth_client.delete(f"/api/files/delete/{get_item_fullpath(deletable_file.id)}")
        assert response.status_code == 200
        assert get_item(deletable_file.id) is None
        assert not (CONFIG.storage.vault_folder / deletable_file.system_path).exists()

    def test_delete_folder(self, auth_client: TestClient, deletable_folder: FSItem):
        path = get_item_fullpath(deletable_folder.id)

        # Not specifying `as_dir` should fail
        response = auth_client.delete(f"/api/files/delete/{path}")
        assert response.status_code == 400
        assert get_item(deletable_folder.id) is not None

        # Specifying `as_dir` should work
        response = auth_client.delete(f"/api/files/delete/{path}?as_dir=true")
        assert response.status_code == 202
        assert get_item(deletable_folder.id) is None

    def test_delete_folder_with_items(
        self,
        auth_client: TestClient,
        deletable_folder_with_items: tuple[FSItem, list[FSItem]],
    ):
        folder, files = deletable_folder_with_items
        path = get_item_fullpath(folder.id)

        # Not specifying `as_dir` should fail
        response = auth_client.delete(f"/api/files/delete/{path}")
        assert response.status_code == 400

        assert get_item(folder.id) is not None
        for file in files:
            assert get_item(file.id) is not None
            assert (CONFIG.storage.vault_folder / file.system_path).exists()

        # Not specifying `force` should fail
        response = auth_client.delete(f"/api/files/delete/{path}?as_dir=true")
        assert response.status_code == 417

        assert get_item(folder.id) is not None
        for file in files:
            assert get_item(file.id) is not None
            assert (CONFIG.storage.vault_folder / file.system_path).exists()

        # Specifying `force` should work
        response = auth_client.delete(f"/api/files/delete/{path}?as_dir=true&force=true")
        assert response.status_code == 202

        assert get_item(folder.id) is None
        for file in files:
            assert get_item(file.id) is None
            assert not (CONFIG.storage.vault_folder / file.system_path).exists()

    def test_delete_with_encrypted_path(self, auth_client: TestClient, deletable_file: FSItem):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(
            get_item_fullpath(deletable_file.id).as_posix().encode("UTF-8")
        )
        response = auth_client.delete(
            f"/api/files/delete/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200
        assert get_item(deletable_file.id) is None
        assert not (CONFIG.storage.vault_folder / deletable_file.system_path).exists()

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/fake/path")
        assert response.status_code == 404

    def test_delete_root(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/.")
        assert response.status_code == 412
