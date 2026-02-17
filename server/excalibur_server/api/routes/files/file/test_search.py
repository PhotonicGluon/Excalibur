import json
import shutil
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef import ExEF


@pytest.fixture(scope="class")
def search_folder(test_user_vault_folder: Path):
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


def _decrypt_response(response: httpx.Response) -> list[tuple[dict, float]]:
    assert response.status_code == 200
    if response.headers.get("X-Encrypted") == "true":
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        content = ExEF(b"one demo 16B key").decrypt(response.content)
        return json.loads(content)
    else:
        return response.json()


def test_no_auth():
    response = TestClient(app).post("/api/files/search", json="test")
    assert response.status_code == 401


def test_search(auth_client: TestClient, search_folder: Path):
    response = auth_client.post("/api/files/search", json="apple")
    content = _decrypt_response(response)
    assert {item[0]["name"].removesuffix(".exef") for item in content} == {
        "apple-fruit-file",
        "snapple-fruit-file",
    }


def test_search_transit_encryption(auth_client: TestClient, search_folder: Path):
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


def test_search_limit(auth_client: TestClient, search_folder: Path):
    response = auth_client.post("/api/files/search?limit=3", json="fruit-file")
    content = _decrypt_response(response)
    assert len(content) == 3

    response = auth_client.post("/api/files/search?limit=10", json="fruit-file")
    content = _decrypt_response(response)
    assert len(content) == 6


def test_search_score_threshold(auth_client: TestClient, search_folder: Path):
    response = auth_client.post("/api/files/search?limit=0&score_threshold=0", json="file")
    content = _decrypt_response(response)
    assert "some-random-file" in {item[0]["name"].removesuffix(".exef") for item in content}
