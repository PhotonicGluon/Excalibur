import json
from base64 import b64decode, b64encode
from uuid import uuid4

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem


@pytest.fixture()
def dir_with_items(test_user, db_session: Session, name_fields) -> dict:
    root_id = test_user["root_id"]

    # Create folder
    folder = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "folder"))
    db_session.add(folder)

    # Create an empty folder
    empty_folder = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "empty-folder"))
    db_session.add(empty_folder)

    # Create file
    file = FSItem(parent_id=root_id, root_id=root_id, is_folder=False, size=0, **name_fields(root_id, "file"))
    db_session.add(file)

    # Create subfile in folder
    subfile = FSItem(parent_id=folder.id, root_id=root_id, is_folder=False, size=0, **name_fields(folder.id, "subfile"))
    db_session.add(subfile)

    # Commit all items
    db_session.commit()
    yield {"folder": folder, "empty-folder": empty_folder, "file": file, "subfile": subfile, "root": root_id}

    # Clean up
    if get_item(folder.id) is not None:
        db_session.delete(folder)
        db_session.delete(empty_folder)
        db_session.delete(file)
        db_session.delete(subfile)
        db_session.commit()


class TestCheckItem:
    @staticmethod
    def _encrypt(value: str) -> str:
        from base64 import b64encode

        return b64encode(ExEF(b"one demo 16B key").encrypt(value.encode()), altchars=b"-_").decode("UTF-8")

    def test_no_auth(self, dir_with_items):
        response = TestClient(app).head(f"/api/files/check/item/{dir_with_items['file'].id}")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient, dir_with_items):
        # Root directory should exist
        response = auth_client.head(f"/api/files/check/item/{dir_with_items['root']}")
        assert response.status_code == 202  # Is directory

        # File should exist
        response = auth_client.head(f"/api/files/check/item/{dir_with_items['file'].id}")
        assert response.status_code == 200  # Is file

        # Directory should exist
        response = auth_client.head(f"/api/files/check/item/{dir_with_items['folder'].id}")
        assert response.status_code == 202  # Is directory

        # Subfile should exist
        response = auth_client.head(f"/api/files/check/item/{dir_with_items['subfile'].id}")
        assert response.status_code == 200  # Is file

    def test_non_existent(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head(f"/api/files/check/item/{uuid4()}")
        assert response.status_code == 404

    def test_invalid_id(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head("/api/files/check/item/not-a-uuid")
        assert response.status_code == 404

    def test_encrypted_id(self, auth_client: TestClient, dir_with_items):
        # Existent
        response = auth_client.head(
            f"/api/files/check/item/{self._encrypt(str(dir_with_items['file'].id))}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 200

        # Non-existent
        response = auth_client.head(
            f"/api/files/check/item/{self._encrypt(str(uuid4()))}", headers={"X-Encrypted": "true"}
        )
        assert response.status_code == 404

    def test_root_dot_encrypted(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head(f"/api/files/check/item/{self._encrypt('.')}", headers={"X-Encrypted": "true"})
        assert response.status_code == 202  # Is directory


class TestCheckNames:
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

    @pytest.fixture
    def tag(self, encrypted_name):
        """
        :returns: helper that gives the Base64 name tag of a name in a folder
        """

        return lambda parent_id, name: encrypted_name(parent_id, name)["name_tag"]

    def test_no_auth(self, dir_with_items, tag):
        root_id = dir_with_items["root"]
        response = TestClient(app).post(
            "/api/files/check/names", json={"parent_id": str(root_id), "name_tags": [tag(root_id, "file")]}
        )
        assert response.status_code == 401

    def test_endpoint(self, auth_client: TestClient, dir_with_items, tag):
        root_id = dir_with_items["root"]
        response = auth_client.post(
            "/api/files/check/names",
            json={
                "parent_id": str(root_id),
                "name_tags": [tag(root_id, "file"), tag(root_id, "folder"), tag(root_id, "does-not-exist")],
            },
        )
        assert self._decrypt_and_parse_response(response)[:3] == "110"

    def test_in_subfolder(self, auth_client: TestClient, dir_with_items, tag):
        folder_id = dir_with_items["folder"].id
        response = auth_client.post(
            "/api/files/check/names",
            json={
                "parent_id": str(folder_id),
                "name_tags": [tag(folder_id, "subfile"), tag(folder_id, "file"), tag(folder_id, "folder")],
            },
        )
        assert self._decrypt_and_parse_response(response)[:3] == "100"

    def test_empty(self, auth_client: TestClient, dir_with_items):
        response = auth_client.post(
            "/api/files/check/names", json={"parent_id": str(dir_with_items["root"]), "name_tags": []}
        )
        assert response.status_code == 200
        assert self._decrypt_and_parse_response(response) == ""

    def test_root_dot(self, auth_client: TestClient, dir_with_items, tag):
        root_id = dir_with_items["root"]
        response = auth_client.post(
            "/api/files/check/names", json={"parent_id": ".", "name_tags": [tag(root_id, "file"), tag(root_id, "nope")]}
        )
        assert self._decrypt_and_parse_response(response)[:2] == "10"

    def test_encrypted(self, auth_client: TestClient, dir_with_items, tag):
        root_id = dir_with_items["root"]
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }

        body = {
            "parent_id": ".",
            "name_tags": [tag(root_id, "file"), tag(root_id, "folder"), tag(root_id, "does-not-exist")],
        }
        body_encrypted = ExEF(b"one demo 16B key").encrypt(json.dumps(body).encode("UTF-8"))
        response = auth_client.post("/api/files/check/names", headers=headers, content=body_encrypted)
        assert response.status_code == 200
        assert self._decrypt_and_parse_response(response)[:3] == "110"

    def test_parent_not_found(self, auth_client: TestClient, dir_with_items, tag):
        parent_id = uuid4()
        response = auth_client.post(
            "/api/files/check/names", json={"parent_id": str(parent_id), "name_tags": [tag(parent_id, "file")]}
        )
        assert response.status_code == 404

    def test_parent_is_not_a_folder(self, auth_client: TestClient, dir_with_items, tag):
        file_id = dir_with_items["file"].id
        response = auth_client.post(
            "/api/files/check/names", json={"parent_id": str(file_id), "name_tags": [tag(file_id, "file")]}
        )
        assert response.status_code == 404

    def test_parent_of_another_user(self, auth_client: TestClient, db_session: Session, tag):
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        other_item = FSItem(
            parent_id=other_root.id,
            root_id=other_root.id,
            name_enc=b"x",
            name_tag=b64decode(tag(other_root.id, "foreign")),
        )
        db_session.add_all([other_root, other_item])
        db_session.commit()

        try:
            response = auth_client.post(
                "/api/files/check/names",
                json={"parent_id": str(other_root.id), "name_tags": [tag(other_root.id, "foreign")]},
            )
            assert response.status_code == 404
        finally:
            db_session.delete(other_item)
            db_session.delete(other_root)
            db_session.commit()

    def test_invalid_tags_never_match(self, auth_client: TestClient, dir_with_items, tag):
        root_id = dir_with_items["root"]
        response = auth_client.post(
            "/api/files/check/names",
            json={"parent_id": str(root_id), "name_tags": [b64encode(b"short").decode(), tag(root_id, "file")]},
        )
        assert self._decrypt_and_parse_response(response)[:2] == "01"

    def test_legacy_items_have_no_tag(self, auth_client: TestClient, test_user, db_session: Session, tag):
        root_id = test_user["root_id"]
        legacy = FSItem(parent_id=root_id, root_id=root_id, name="legacy-check")
        db_session.add(legacy)
        db_session.commit()

        try:
            # Legacy items cannot be found by tag; the client checks its decrypted listing for those
            response = auth_client.post(
                "/api/files/check/names", json={"parent_id": ".", "name_tags": [tag(root_id, "legacy-check")]}
            )
            assert self._decrypt_and_parse_response(response)[:1] == "0"
        finally:
            db_session.delete(legacy)
            db_session.commit()

    def test_tricky(self, auth_client: TestClient, dir_with_items, tag):
        root_id = dir_with_items["root"]
        folder_id = dir_with_items["folder"].id
        response = auth_client.post(
            "/api/files/check/names",
            json={
                "parent_id": str(root_id),
                "name_tags": [
                    tag(root_id, "file"),
                    tag(root_id, "file"),  # Duplicate of the above
                    tag(root_id, "does-not-exist"),
                    tag(root_id, "folder/subfile"),  # Not a direct child
                    tag(folder_id, "subfile"),  # Exists, but in a different folder
                    tag(root_id, "empty-folder"),
                    tag(root_id, "folder"),
                ],
            },
        )
        assert self._decrypt_and_parse_response(response)[:7] == "1100011"

    @pytest.mark.parametrize("num_tags", [8, 16, 24, 32])
    def test_num_tags_being_multiple_of_8(self, auth_client: TestClient, dir_with_items, tag, num_tags):
        root_id = dir_with_items["root"]
        response = auth_client.post(
            "/api/files/check/names",
            json={"parent_id": str(root_id), "name_tags": [tag(root_id, "file")] * num_tags},
        )
        assert self._decrypt_and_parse_response(response) == "1" * num_tags


class TestCheckDir:
    def test_no_auth(self):
        response = TestClient(app).head(f"/api/files/check/dir/{uuid4()}")
        assert response.status_code == 401

    def test_existent(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head(f"/api/files/check/dir/{dir_with_items['empty-folder'].id}")
        assert response.status_code == 200  # Empty

        response = auth_client.head(f"/api/files/check/dir/{dir_with_items['folder'].id}")
        assert response.status_code == 202  # Non-empty

    def test_non_existent(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head(f"/api/files/check/dir/{uuid4()}")
        assert response.status_code == 404

    def test_not_a_directory(self, auth_client: TestClient, dir_with_items):
        response = auth_client.head(f"/api/files/check/dir/{dir_with_items['file'].id}")
        assert response.status_code == 404

    def test_encrypted_id(self, auth_client: TestClient, dir_with_items):
        id_encrypted = ExEF(b"one demo 16B key").encrypt(str(dir_with_items["folder"].id).encode())
        response = auth_client.head(
            f"/api/files/check/dir/{b64encode(id_encrypted, altchars=b'-_').decode('UTF-8')}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 202
