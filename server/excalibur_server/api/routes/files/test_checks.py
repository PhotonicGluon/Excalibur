import json

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem


@pytest.fixture()
def dir_with_items(test_user, db_session: Session):
    root_id = test_user["root_id"]

    # Create folder
    folder = FSItem(parent_id=root_id, root_id=root_id, name="folder", is_folder=True)
    db_session.add(folder)

    # Create an empty folder
    empty_folder = FSItem(parent_id=root_id, root_id=root_id, name="empty-folder", is_folder=True)
    db_session.add(empty_folder)

    # Create file
    file = FSItem(parent_id=root_id, root_id=root_id, name="file", is_folder=False, size=0)
    db_session.add(file)

    # Create subfile in folder
    subfile = FSItem(parent_id=folder.id, root_id=root_id, name="subfile", is_folder=False, size=0)
    db_session.add(subfile)

    # Commit all items
    db_session.commit()
    yield

    # Clean up
    if get_item(folder.id) is not None:
        db_session.delete(folder)
        db_session.delete(empty_folder)
        db_session.delete(file)
        db_session.delete(subfile)
        db_session.commit()


class TestCheckPath:
    def test_no_auth(self, dir_with_items):
        response = TestClient(app).head("/api/files/check/path/.")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient, dir_with_items):
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

    def test_non_existent(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head("/api/files/check/path/does-not-exist")
        assert response.status_code == 404

    def test_encrypted_path(self, auth_client: TestClient, dir_with_items):
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

    def test_dot_slashes(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head("/api/files/check/path/./file")
        assert response.status_code == 200

        response = auth_client.head("/api/files/check/path/./folder/././subfile/.")
        assert response.status_code == 200

    def test_dot_slashes_encrypted(self, auth_client: TestClient, dir_with_items):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"./file")
        response = auth_client.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"./folder/././subfile/.")
        response = auth_client.head(
            f"/api/files/check/path/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200


class TestCheckPaths:
    @staticmethod
    def _decrypt_and_parse_response(response: httpx2.Response) -> str:
        assert response.status_code == 200
        if response.headers.get("X-Encrypted") == "true":
            assert ExEF.validate(response.content), "Did not return an encrypted response"
            content = ExEF(b"one demo 16B key").decrypt(response.content)
        else:
            content = response.content

        # Convert to bits
        return "".join(format(byte, "08b") for byte in content)

    def test_no_auth(self, dir_with_items):
        response = TestClient(app).post("/api/files/check/paths", json=["."])
        assert response.status_code == 401

    def test_endpoint(self, auth_client: TestClient, dir_with_items):
        response = auth_client.post(
            "/api/files/check/paths", json=[".", "file", "folder", "folder/subfile", "does-not-exist"]
        )
        assert self._decrypt_and_parse_response(response)[:5] == "11110"

    def test_empty(self, auth_client: TestClient, dir_with_items):
        response = auth_client.post("/api/files/check/paths", json=[])
        assert response.status_code == 200
        assert self._decrypt_and_parse_response(response) == ""

    def test_encrypted(self, auth_client: TestClient, dir_with_items):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }

        body_encrypted = ExEF(b"one demo 16B key").encrypt(
            json.dumps([".", "file", "folder", "folder/subfile", "does-not-exist"]).encode("UTF-8")
        )
        response = auth_client.post("/api/files/check/paths", headers=headers, content=body_encrypted)
        assert response.status_code == 200
        assert self._decrypt_and_parse_response(response)[:5] == "11110"

    def test_tricky(self, auth_client: TestClient, dir_with_items):
        response = auth_client.post(
            "/api/files/check/paths",
            json=[
                "./folder/././subfile/.",  # Dot slashes
                "folder/subfile",  # Duplicate of the above
                "folder/does-not-exist",  # Existing parent, missing child
                "does-not-exist/subfile",  # Missing parent
                "file/subfile",  # Parent is a file
                "empty-folder",
                "folder",
            ],
        )
        assert self._decrypt_and_parse_response(response)[:7] == "1100011"

    @pytest.mark.parametrize("num_paths", [8, 16, 24, 32])
    def test_num_paths_being_multiple_of_8(self, auth_client: TestClient, dir_with_items, num_paths):
        response = auth_client.post(
            "/api/files/check/paths",
            json=["."] * num_paths,
        )
        assert self._decrypt_and_parse_response(response) == "1" * num_paths


class TestCheckDir:
    def test_no_auth(self):
        response = TestClient(app).head("/api/files/check/dir/.")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head("/api/files/check/dir/empty-folder")
        assert response.status_code == 200  # Empty

        response = auth_client.head("/api/files/check/dir/folder")
        assert response.status_code == 202  # Non-empty

    def test_encrypted_path(self, auth_client: TestClient, dir_with_items):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(b"folder")
        response = auth_client.head(
            f"/api/files/check/dir/{b64encode(path_encrypted).decode('UTF-8')}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 202
