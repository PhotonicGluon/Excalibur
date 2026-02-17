import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.config import CONFIG


@pytest.fixture(scope="session", autouse=True)
def disable_proof_checks():
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "0"
    yield
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "1"


@pytest.fixture(scope="class")
def auth_client() -> TestClient:
    """
    An authenticated client for testing.
    """

    MASTER_KEYS_CACHE["some-uuid"] = b"one demo 16B key"
    token = generate_auth_token("test-user", "some-uuid", datetime.now(tz=timezone.utc).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


@pytest.fixture(scope="session", autouse=True)
def test_user_vault_folder(tmp_path_factory: pytest.TempPathFactory):
    vault = tmp_path_factory.mktemp("vault")
    CONFIG.storage.vault_folder = vault

    test_user_folder = vault / "test-user"
    test_user_folder.mkdir()
    yield test_user_folder
    shutil.rmtree(vault)


@pytest.fixture(scope="session", autouse=True)
def setup_test_vault_files(test_user_vault_folder: Path):
    folder = test_user_vault_folder / "folder"
    folder.mkdir()

    empty_folder = test_user_vault_folder / "empty-folder"
    empty_folder.mkdir()

    (test_user_vault_folder / "file").touch()
    (folder / "subfile").touch()

    yield
