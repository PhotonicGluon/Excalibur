import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF
from excalibur_server.src.files.structures import Directory, File


class TestListdir:
    @pytest.fixture
    def dir_with_items(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Make containing folder
        folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="test-dir",
            is_folder=True,
        )
        db_session.add(folder)

        # Make test files
        file1 = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="test-file.txt.exef",
            size=100,
        )
        file2 = FSItem(
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

    def test_listdir(self, auth_client_db: TestClient, dir_with_items: FSItem):
        response = auth_client_db.get(f"/api/files/list/{get_item_fullpath(dir_with_items.id)}")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode())
        directory = Directory(**response)
        assert directory.name == "test-dir"
        assert directory.fullpath == "test-dir"
        assert directory.type == "directory"
        assert len(directory.items) == 2

        items: list[File] = sorted(directory.items, key=lambda item: item.name)
        assert items[0].name == "test-file.txt.exef"
        assert items[0].fullpath == "test-dir/test-file.txt.exef"
        assert items[0].type == "file"
        assert items[0].size == 100 - ExEF.additional_size
        assert items[1].name == "test-file2.txt.exef"
        assert items[1].fullpath == "test-dir/test-file2.txt.exef"
        assert items[1].type == "file"
        assert items[1].size == 100 - ExEF.additional_size

    def test_listdir_encrypted_path(self, auth_client_db: TestClient, dir_with_items: FSItem):
        from base64 import b64encode

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(
            f"{get_item_fullpath(dir_with_items.id)}".encode("UTF-8")
        )

        response = auth_client_db.get(
            f"/api/files/list/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = json.loads(ExEF(b"one demo 16B key").decrypt(response.content).decode())
        directory = Directory(**response)
        assert directory.name == "test-dir"
        assert directory.fullpath == "test-dir"
        assert directory.type == "directory"
        assert len(directory.items) == 2

    def test_path_not_found(self, auth_client_db: TestClient):
        response = auth_client_db.get("/api/files/list/fake/path")
        assert response.status_code == 404
