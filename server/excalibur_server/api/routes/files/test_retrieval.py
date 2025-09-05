import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF
from excalibur_server.src.files.structures import Directory


@pytest.fixture
def dir_with_items(test_user_vault_folder: Path):
    (test_user_vault_folder / "test-dir").mkdir()
    (test_user_vault_folder / "test-dir" / "test-file.txt.exef").write_bytes(b"a" * 100)
    (test_user_vault_folder / "test-dir" / "test-file2.txt.exef").write_bytes(b"b" * 100)
    (test_user_vault_folder / "test-dir" / "should-be-ignored.txt").write_bytes(b"c" * 100)

    yield test_user_vault_folder / "test-dir"

    shutil.rmtree(test_user_vault_folder / "test-dir")


class TestDownloadFile:
    def test_no_auth(self, dir_with_items: Path):
        response = TestClient(app).get(f"/api/files/download/{dir_with_items}")
        assert response.status_code == 401

    def test_download_file(self, auth_client: TestClient, dir_with_items: Path):
        response = auth_client.get(f"/api/files/download/{dir_with_items}/test-file.txt.exef")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"a" * 100

    def test_file_not_found(self, auth_client: TestClient):
        response = auth_client.get("/api/files/download/fake-file.txt.exef")
        assert response.status_code == 404

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.get("/api/files/download/%2E%2E/oops")
        assert response.status_code == 406


class TestListdir:
    def test_no_auth(self, test_user_vault_folder: Path):
        response = TestClient(app).get(f"/api/files/list/{test_user_vault_folder}")
        assert response.status_code == 401

    def test_listdir(self, auth_client: TestClient, dir_with_items: Path):
        response = auth_client.get(f"/api/files/list/{dir_with_items}")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode())
        directory = Directory(**response)
        assert directory.name == "test-dir"
        assert directory.fullpath == "test-dir"
        assert directory.type == "directory"
        assert len(directory.items) == 2

        assert directory.items[0].name == "test-file.txt.exef"
        assert directory.items[0].fullpath == "test-dir/test-file.txt.exef"
        assert directory.items[0].type == "file"
        assert directory.items[0].size == 100 - ExEF.additional_size
        assert directory.items[0].mimetype == "text/plain"
        assert directory.items[1].name == "test-file2.txt.exef"
        assert directory.items[1].fullpath == "test-dir/test-file2.txt.exef"
        assert directory.items[1].type == "file"
        assert directory.items[1].size == 100 - ExEF.additional_size
        assert directory.items[1].mimetype == "text/plain"

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.get("/api/files/list/fake/path")
        assert response.status_code == 404

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.get("/api/files/list/%2E%2E/oops")
        assert response.status_code == 406
