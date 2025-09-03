import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app


@pytest.fixture(scope="class")
def rename_folder(test_user_vault_folder: Path):
    r_folder = test_user_vault_folder / "rename-folder"
    r_folder.mkdir()
    yield r_folder
    shutil.rmtree(r_folder)


class TestRenameItem:
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
        response = auth_client.post("/api/files/rename/rename-folder/r-file", json="" + "a" * 1000)
        assert response.status_code == 414  # Path too long
