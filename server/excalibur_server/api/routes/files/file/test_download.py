from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem


class TestDownload:
    @pytest.fixture
    def file_in_dir(self, test_user, db_session: Session) -> FSItem:
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
        file = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="test-file.txt.exef",
            is_folder=False,
        )
        file_path = CONFIG.storage.vault_folder / file.system_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file.size = file_path.write_bytes(b"a" * 100)
        db_session.add(file)

        # Commit and yield
        db_session.commit()
        yield file

        # Clean up
        if get_item(folder.id) is not None:
            db_session.delete(file)
            db_session.delete(folder)
            db_session.commit()

        if file_path.exists():
            file_path.unlink()

    def test_no_auth(self):
        response = TestClient(app).get(f"/api/files/download/{uuid4()}")
        assert response.status_code == 401

    def test_download_file(self, auth_client: TestClient, file_in_dir: FSItem):
        response = auth_client.get(f"/api/files/download/{file_in_dir.id}")
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"a" * 100

    def test_download_file_encrypted_path(self, auth_client: TestClient, file_in_dir: FSItem):
        from base64 import b64encode

        path_encrypted = ExEF(b"one demo 16B key").encrypt(str(file_in_dir.id).encode("utf-8"))

        response = auth_client.get(
            f"/api/files/download/{b64encode(path_encrypted, altchars=b'-_').decode()}",
            headers={"X-Encrypted": "true"},
        )
        assert response.status_code == 200
        assert ExEF.validate(response.content), "Did not return an encrypted response"

        response = ExEF(b"one demo 16B key").decrypt(response.content)
        assert response == b"a" * 100

    def test_file_not_found(self, auth_client: TestClient):
        response = auth_client.get(f"/api/files/download/{uuid4()}")
        assert response.status_code == 404

    def test_download_folder(self, auth_client: TestClient, file_in_dir: FSItem):
        response = auth_client.get(f"/api/files/download/{file_in_dir.parent_id}")
        assert response.status_code == 404
