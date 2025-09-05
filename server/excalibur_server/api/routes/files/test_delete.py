import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF


class TestDeletePath:
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

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/fake/path")
        assert response.status_code == 404

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/%2E%2E/oops")
        assert response.status_code == 406

    def test_delete_root(self, auth_client: TestClient):
        response = auth_client.delete("/api/files/delete/.")
        assert response.status_code == 412
