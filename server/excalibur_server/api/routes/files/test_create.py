from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.exef.exef import ExEF


class TestUploadFile:
    @pytest.fixture(scope="class")
    def example_file(self, tmp_path_factory: pytest.TempPathFactory) -> Path:
        file = tmp_path_factory.mktemp("test") / "test.txt.exef"

        encrypted_data = ExEF(b"one demo 16B key").encrypt(b"test")
        file.write_bytes(encrypted_data)
        yield file
        file.unlink()

    def test_no_auth(self, example_file: Path):
        with open(example_file, "rb") as f:
            response = TestClient(app).post("/api/files/upload/.", content=f)
        assert response.status_code == 401

    def test_upload_no_transit_encryption(
        self, auth_client: TestClient, example_file: Path, test_user_vault_folder: Path
    ):
        uuid = uuid4().hex
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.txt.exef", content=f)

        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"File uploaded"

        uploaded_file = test_user_vault_folder / f"test-{uuid}.txt.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == example_file.read_bytes()

    def test_upload_transit_encryption(self, auth_client: TestClient, example_file: Path, test_user_vault_folder: Path):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(example_file.read_bytes())
        response = auth_client.post(
            f"/api/files/upload/.?name=test-{uuid}.txt.exef", headers=headers, content=transit_encrypted_data
        )

        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"File uploaded"

        uploaded_file = test_user_vault_folder / f"test-{uuid}.txt.exef"
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == example_file.read_bytes()

    # TODO: ADD MORE TESTS
