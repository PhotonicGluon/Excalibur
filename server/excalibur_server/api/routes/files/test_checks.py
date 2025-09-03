from fastapi.testclient import TestClient

from excalibur_server.api.app import app


class TestCheckPath:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/path/.")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient):
        # Root directory should exist
        response = auth_client.head("/api/files/check/path/.")
        assert response.status_code == 202  # Is directory

        # File should exist
        response = auth_client.head("/api/files/check/path/file")
        assert response.status_code == 200  # Is file

        # Directory should exist
        response = auth_client.head("/api/files/check/path/folder")
        assert response.status_code == 202  # Is directory

        # Subfile should exist
        response = auth_client.head("/api/files/check/path/folder/subfile")
        assert response.status_code == 200  # Is file

    def test_non_existent(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/path/does-not-exist")
        assert response.status_code == 404

    def test_path_too_long(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/path/" + "a" * 1000)
        assert response.status_code == 414

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/path/%2E%2E/oh-no")  # %2E%2E = ..
        assert response.status_code == 406


class TestCheckFileSize:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/size?size=401401")
        assert response.status_code == 401

    def test_size_ok(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/size?size=1")
        assert response.status_code == 200

    def test_size_too_large(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/size?size=" + "1" * 100)
        assert response.status_code == 416


class TestCheckDir:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/dir/.")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/dir/empty-folder")
        assert response.status_code == 200  # Empty

        response = auth_client.head("/api/files/check/dir/folder")
        assert response.status_code == 202  # Non-empty

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/dir/%2E%2E/oh-no")  # %2E%2E = ..
        assert response.status_code == 406
