import json
import shutil
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF


def _decrypt_response(response: httpx.Response) -> list[tuple[dict, float]]:
    assert response.status_code == 200
    if response.headers.get("X-Encrypted") == "true":
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        content = ExEF(b"one demo 16B key").decrypt(response.content)
        return json.loads(content)
    else:
        return response.json()


class TestSearch:
    @pytest.fixture(scope="class")
    def search_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Create search folders
        folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="search-folder",
            is_folder=True,
        )
        subfolder = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="subfolder",
            is_folder=True,
        )
        db_session.add(folder)
        db_session.add(subfolder)

        # Make test files
        file1 = FSItem(
            parent_id=folder.id, root_id=root_id, name="apple-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file2 = FSItem(
            parent_id=folder.id, root_id=root_id, name="banana-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file3 = FSItem(
            parent_id=folder.id, root_id=root_id, name="snapple-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file4 = FSItem(
            parent_id=folder.id, root_id=root_id, name="cherry-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file5 = FSItem(
            parent_id=subfolder.id, root_id=root_id, name="dragon-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file6 = FSItem(
            parent_id=subfolder.id, root_id=root_id, name="elderberry-fruit-file.exef", size=1234, mimetype="text/plain"
        )
        file7 = FSItem(
            parent_id=root_id, root_id=root_id, name="some-random-file.exef", size=1234, mimetype="text/plain"
        )

        db_session.add(file1)
        db_session.add(file2)
        db_session.add(file3)
        db_session.add(file4)
        db_session.add(file5)
        db_session.add(file6)
        db_session.add(file7)

        # Commit and yield
        db_session.commit()
        yield folder

        # Clean up
        if get_item(folder.id) is not None:
            db_session.delete(file1)
            db_session.delete(file2)
            db_session.delete(file3)
            db_session.delete(file4)
            db_session.delete(file5)
            db_session.delete(file6)
            db_session.delete(file7)
            db_session.delete(subfolder)
            db_session.delete(folder)
            db_session.commit()

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/search", json="test")
        assert response.status_code == 401

    def test_search(self, auth_client_db: TestClient, search_folder: FSItem):
        response = auth_client_db.post("/api/files/search", json="apple")
        content = _decrypt_response(response)
        assert {item[0]["name"].removesuffix(".exef") for item in content} == {
            "apple-fruit-file",
            "snapple-fruit-file",
        }

    def test_search_transit_encryption(self, auth_client_db: TestClient, search_folder: FSItem):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        query_encrypted = ExEF(b"one demo 16B key").encrypt(b"apple")
        response = auth_client_db.post(
            "/api/files/search",
            headers=headers,
            content=query_encrypted,
        )

        content = _decrypt_response(response)
        assert {item[0]["name"].removesuffix(".exef") for item in content} == {
            "apple-fruit-file",
            "snapple-fruit-file",
        }

    def test_search_limit(self, auth_client_db: TestClient, search_folder: FSItem):
        response = auth_client_db.post("/api/files/search?limit=3", json="fruit-file")
        content = _decrypt_response(response)
        assert len(content) == 3

        response = auth_client_db.post("/api/files/search?limit=10", json="fruit-file")
        content = _decrypt_response(response)
        assert len(content) == 6

    def test_search_score_threshold(self, auth_client_db: TestClient, search_folder: FSItem):
        response = auth_client_db.post("/api/files/search?limit=0&score_threshold=0", json="file")
        content = _decrypt_response(response)
        assert "some-random-file" in {item[0]["name"].removesuffix(".exef") for item in content}


# Legacy tests (without database filesystem)
class TestSearchOld:
    @pytest.fixture(scope="class")
    def search_folder(self, test_user_vault_folder: Path):
        s_folder = test_user_vault_folder / "search-folder"
        s_folder.mkdir()

        (s_folder / "apple-fruit-file.exef").touch()
        (s_folder / "banana-fruit-file.exef").touch()
        (s_folder / "snapple-fruit-file.exef").touch()
        (s_folder / "cherry-fruit-file.exef").touch()
        (s_folder / "subfolder").mkdir()
        (s_folder / "subfolder" / "dragon-fruit-file.exef").touch()
        (s_folder / "subfolder" / "elderberry-fruit-file.exef").touch()

        (s_folder / "some-random-file.exef").touch()

        yield s_folder

        shutil.rmtree(s_folder)

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/search", json="test")
        assert response.status_code == 401

    def test_search(self, auth_client: TestClient, search_folder: Path):
        response = auth_client.post("/api/files/search", json="apple")
        content = _decrypt_response(response)
        assert {item[0]["name"].removesuffix(".exef") for item in content} == {
            "apple-fruit-file",
            "snapple-fruit-file",
        }

    def test_search_transit_encryption(self, auth_client: TestClient, search_folder: Path):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        query_encrypted = ExEF(b"one demo 16B key").encrypt(b"apple")
        response = auth_client.post(
            "/api/files/search",
            headers=headers,
            content=query_encrypted,
        )

        content = _decrypt_response(response)
        assert {item[0]["name"].removesuffix(".exef") for item in content} == {
            "apple-fruit-file",
            "snapple-fruit-file",
        }

    def test_search_limit(self, auth_client: TestClient, search_folder: Path):
        response = auth_client.post("/api/files/search?limit=3", json="fruit-file")
        content = _decrypt_response(response)
        assert len(content) == 3

        response = auth_client.post("/api/files/search?limit=10", json="fruit-file")
        content = _decrypt_response(response)
        assert len(content) == 6

    def test_search_score_threshold(self, auth_client: TestClient, search_folder: Path):
        response = auth_client.post("/api/files/search?limit=0&score_threshold=0", json="file")
        content = _decrypt_response(response)
        assert "some-random-file" in {item[0]["name"].removesuffix(".exef") for item in content}
