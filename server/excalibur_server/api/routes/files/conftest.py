import shutil
from pathlib import Path

import pytest

from excalibur_server.src.config import CONFIG


@pytest.fixture(scope="session", autouse=True)
def test_user_vault_folder(tmp_path_factory: pytest.TempPathFactory):
    vault = tmp_path_factory.mktemp("vault")
    CONFIG.server.vault_folder = vault

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
