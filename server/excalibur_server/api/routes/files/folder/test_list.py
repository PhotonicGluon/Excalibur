import json
from base64 import b64decode
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import Directory, File


class TestListdir:
    @pytest.fixture
    def dir_with_items(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Make containing folder
        folder = FSItem(
            id=UUID("00000000-0000-0000-0000-000000000000"),
            parent_id=root_id,
            root_id=root_id,
            name="test-dir",
            is_folder=True,
        )
        db_session.add(folder)

        # Make test files
        file1 = FSItem(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            parent_id=folder.id,
            root_id=root_id,
            name_enc=b"encrypted-file-name",
            name_tag=b"\x01" * 32,
            size=100,
        )
        file2 = FSItem(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            parent_id=folder.id,
            root_id=root_id,
            name="test-file2.txt.exef",
            size=100,
        )
        db_session.add(file1)
        db_session.add(file2)

        # Commit and yield
        db_session.commit()
        yield folder

        # Clean up
        if get_item(folder.id) is not None:
            db_session.delete(file1)
            db_session.delete(file2)
            db_session.delete(folder)
            db_session.commit()

    def test_no_auth(self):
        response = TestClient(app).get("/api/files/list/.")
        assert response.status_code == 401

    def test_listdir(self, auth_client: TestClient, test_user, dir_with_items: FSItem):
        response = auth_client.get(f"/api/files/list/{dir_with_items.id}")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode())
        directory = Directory(**response)
        assert str(directory.id) == "00000000-0000-0000-0000-000000000000"
        assert directory.name == "test-dir"
        assert directory.parent_id == test_user["root_id"]
        assert directory.type == "directory"
        assert len(directory.items) == 2

        # A migrated item only has an encrypted name...
        items: list[File] = sorted(directory.items, key=lambda item: item.id)
        assert str(items[0].id) == "00000000-0000-0000-0000-000000000001"
        assert items[0].parent_id == dir_with_items.id
        assert items[0].name is None
        assert b64decode(items[0].name_enc) == b"encrypted-file-name"
        assert items[0].type == "file"
        assert items[0].size == 100

        # ...whereas a legacy item only has a plaintext name
        assert str(items[1].id) == "00000000-0000-0000-0000-000000000002"
        assert items[1].parent_id == dir_with_items.id
        assert items[1].name == "test-file2.txt.exef"
        assert items[1].name_enc is None
        assert items[1].type == "file"
        assert items[1].size == 100

    def test_listdir_encrypted_path(self, auth_client: TestClient, dir_with_items: FSItem):
        from base64 import b64encode

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(str(dir_with_items.id).encode())

        response = auth_client.get(
            f"/api/files/list/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode())
        directory = Directory(**response)
        assert str(directory.id) == "00000000-0000-0000-0000-000000000000"
        assert directory.name == "test-dir"
        assert directory.type == "directory"
        assert len(directory.items) == 2

    def test_listdir_root_dot(self, auth_client: TestClient, test_user, dir_with_items: FSItem):
        from base64 import b64encode

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(b".")
        response = auth_client.get(
            f"/api/files/list/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 200

        directory = Directory(**json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode()))
        assert directory.id == test_user["root_id"]
        assert directory.parent_id is None
        assert "test-dir" in [item.name for item in directory.items]

    def test_not_a_directory(self, auth_client: TestClient, dir_with_items: FSItem):
        response = auth_client.get("/api/files/list/00000000-0000-0000-0000-000000000001")
        assert response.status_code == 404

    def test_invalid_id(self, auth_client: TestClient):
        response = auth_client.get("/api/files/list/not-a-uuid")
        assert response.status_code == 404

    def test_id_not_found(self, auth_client: TestClient):
        response = auth_client.get(f"/api/files/list/{uuid4()}")
        assert response.status_code == 404
