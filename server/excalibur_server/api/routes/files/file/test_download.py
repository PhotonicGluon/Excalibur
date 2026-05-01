from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item, get_item_fullpath
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


class TestDownload:
    @pytest.fixture
    def dir_with_items(self, test_user, test_user_db_vault_folder: Path, db_session: Session) -> FSItem:
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
        file_id = uuid4()
        file_path = test_user_db_vault_folder / f"{file_id}.exef"
        size = file_path.write_bytes(b"a" * 100)

        file = FSItem(
            id=file_id,
            parent_id=folder.id,
            root_id=root_id,
            name="test-file.txt.exef",
            is_folder=False,
            size=size,
        )
        db_session.add(file)

        # Commit and yield
        db_session.commit()
        yield folder

        # Clean up
        if get_item(folder.id) is not None:
            db_session.delete(file)
            db_session.delete(folder)
            db_session.commit()

        if file_path.exists():
            file_path.unlink()

    def test_no_auth(self):
        response = TestClient(app).get("/api/files/download/not-authorized-oops")
        assert response.status_code == 401

    def test_download_file(self, auth_client_db: TestClient, dir_with_items: FSItem):
        response = auth_client_db.get(
            f"/api/files/download/{get_item_fullpath(dir_with_items.id).as_posix()}/test-file.txt.exef"
        )
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"a" * 100

    def test_download_file_encrypted_path(self, auth_client_db: TestClient, dir_with_items: FSItem):
        from base64 import b64encode

        path = f"{get_item_fullpath(dir_with_items.id).as_posix()}/test-file.txt.exef"
        path_encrypted = ExEF(b"one demo 16B key").encrypt(path.encode("utf-8"))

        response = auth_client_db.get(
            f"/api/files/download/{b64encode(path_encrypted, altchars=b'-_').decode()}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"a" * 100

    def test_file_not_found(self, auth_client_db: TestClient):
        response = auth_client_db.get("/api/files/download/fake-file.txt.exef")
        assert response.status_code == 404
