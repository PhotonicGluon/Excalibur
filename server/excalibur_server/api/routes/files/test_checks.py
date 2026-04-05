from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF


class TestCheckPath:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/path/.")
        assert response.status_code == 401

    def test_existent(self, auth_client_db: TestClient):
        # Root directory should exist
        response = auth_client_db.head("/api/files/check/path/.")
        assert response.status_code == 202  # Is directory

        # File should exist
        response = auth_client_db.head("/api/files/check/path/file")
        assert response.status_code == 200  # Is file

        # Directory should exist
        response = auth_client_db.head("/api/files/check/path/folder")
        assert response.status_code == 202  # Is directory

        # Subfile should exist
        response = auth_client_db.head("/api/files/check/path/folder/subfile")
        assert response.status_code == 200  # Is file

    def test_non_existent(self, auth_client_db: TestClient):
        response = auth_client_db.head("/api/files/check/path/does-not-exist")
        assert response.status_code == 404

    def test_encrypted_path(self, auth_client_db: TestClient):
        from base64 import b64encode

        # Existent
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"file")
        response = auth_client_db.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200

        # Non-existent
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"does-not-exist")
        response = auth_client_db.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 404


class TestCheckDir:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/dir/.")
        assert response.status_code == 401

    def test_existent(self, auth_client_db: TestClient):
        response = auth_client_db.head("/api/files/check/dir/empty-folder")
        assert response.status_code == 200  # Empty

        response = auth_client_db.head("/api/files/check/dir/folder")
        assert response.status_code == 202  # Non-empty

    def test_encrypted_path(self, auth_client_db: TestClient):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"folder")
        response = auth_client_db.head(
            f"/api/files/check/dir/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 202


# Legacy tests (without database filesystem)
class TestCheckPathOld:
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

    def test_encrypted_path(self, auth_client: TestClient):
        from base64 import b64encode

        # Existent
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"file")
        response = auth_client.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200

        # Non-existent
        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"does-not-exist")
        response = auth_client.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 404

    def test_path_too_long(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/path/" + "a" * 1000)
        assert response.status_code == 414

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/path/%2E%2E/oh-no")  # %2E%2E = ..
        assert response.status_code == 406


class TestCheckDirOld:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/dir/.")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/dir/empty-folder")
        assert response.status_code == 200  # Empty

        response = auth_client.head("/api/files/check/dir/folder")
        assert response.status_code == 202  # Non-empty

    def test_encrypted_path(self, auth_client: TestClient):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"folder")
        response = auth_client.head(
            f"/api/files/check/dir/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 202

    def test_path_traversal(self, auth_client: TestClient):
        response = auth_client.head("/api/files/check/dir/%2E%2E/oh-no")  # %2E%2E = ..
        assert response.status_code == 406
