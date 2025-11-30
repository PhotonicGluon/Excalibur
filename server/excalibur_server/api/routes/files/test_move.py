import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app


@pytest.fixture(scope="class")
def move_folder(test_user_vault_folder: Path):
    # Create a folder that contains the test items
    containing_folder = test_user_vault_folder / "move-folder"
    containing_folder.mkdir()

    # Create a folder that we can move items into
    move_folder = containing_folder / "move-into"
    move_folder.mkdir()

    # Yield only the containing folder
    yield containing_folder
    shutil.rmtree(move_folder)
    shutil.rmtree(containing_folder)


def test_no_auth():
    response = TestClient(app).post("/api/files/move/m-file", json="move-folder/move-into")
    assert response.status_code == 401


def test_move(auth_client: TestClient, test_user_vault_folder: Path, move_folder: Path):
    # Move file should work
    (move_folder / "m-file").touch()
    response = auth_client.post("/api/files/move/move-folder/m-file", json="move-folder/move-into")
    assert response.status_code == 200
    assert not (move_folder / "m-file").exists()
    assert (move_folder / "move-into" / "m-file").exists()

    # Move folder should work
    (move_folder / "m-folder").mkdir()
    response = auth_client.post("/api/files/move/move-folder/m-folder", json="move-folder/move-into")
    assert response.status_code == 200
    assert not (move_folder / "m-folder").exists()
    assert (move_folder / "move-into" / "m-folder").exists()

    # Root folder moving should work
    (move_folder / "m-root-file").touch()
    response = auth_client.post("/api/files/move/move-folder/m-root-file", json=".")  # Move into root
    assert response.status_code == 200
    assert not (move_folder / "m-root-file").exists()
    assert (test_user_vault_folder / "m-root-file").exists()

    response = auth_client.post("/api/files/move/does-not-exist", json="move-folder/move-into")
    assert response.status_code == 404


def test_path_traversal(auth_client: TestClient, move_folder: Path):
    # Initial access path traversal should fail
    response = auth_client.post("/api/files/move/%2E%2E/oh-no", json="new-name")  # %2E%2E = ..
    assert response.status_code == 406

    # Renamed path traversal should fail
    (move_folder / "m-file").touch()
    response = auth_client.post("/api/files/move/move-folder/m-file", json="../../oh-no")
    assert response.status_code == 406


def test_already_exists(auth_client: TestClient, move_folder: Path):
    (move_folder / "m-file").touch()
    response = auth_client.post("/api/files/move/move-folder/m-file", json="move-folder")
    assert response.status_code == 409  # Item already exists


def test_rename_root(auth_client: TestClient):
    response = auth_client.post("/api/files/move/.", json="new-name")
    assert response.status_code == 412  # Cannot move root


def test_rename_too_long(auth_client: TestClient, move_folder: Path):
    (move_folder / "m-file").touch()
    response = auth_client.post("/api/files/move/move-folder/m-file", json="" + "a" * 1000)
    assert response.status_code == 414  # Path too long
