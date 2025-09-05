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

    def test_file_already_exists(self, auth_client: TestClient, example_file: Path, test_user_vault_folder: Path):
        uuid = uuid4().hex
        uploaded_file = test_user_vault_folder / f"test-{uuid}.txt.exef"

        # Initial upload should be OK
        response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.txt.exef", content=b"first")
        assert response.status_code == 201
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again without `force` should fail
        response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.txt.exef", content=b"second")
        assert response.status_code == 409
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"first"

        # Trying again with `force` should succeed
        response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.txt.exef&force=true", content=b"third")
        assert response.status_code == 201
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == b"third"

    def test_invalid_file_name(self, auth_client: TestClient, example_file: Path):
        uuid = uuid4().hex
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/.?name=test-{uuid}.wrong-extension", content=f)
        assert response.status_code == 417

    def test_path_not_found(self, auth_client: TestClient, example_file: Path):
        uuid = uuid4().hex
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/fake/path?name=test-{uuid}.txt.exef", content=f)
        assert response.status_code == 404

    def test_path_too_long(self, auth_client: TestClient, example_file: Path):
        with open(example_file, "rb") as f:
            response = auth_client.post(f"/api/files/upload/.?name=test-{'a' * 1000}.txt.exef", content=f)
        assert response.status_code == 414

    def test_path_traversal(self, auth_client: TestClient, example_file: Path):
        # Path is invalid
        with open(example_file, "rb") as f:
            response = auth_client.post("/api/files/upload/%2E%2E?name=test.txt.exef", content=f)
        assert response.status_code == 406

        # File name is invalid
        with open(example_file, "rb") as f:
            response = auth_client.post("/api/files/upload/.?name=../fake.txt.exef", content=f)
        assert response.status_code == 406


class TestCreateDirectory:
    def test_no_auth(self):
        uuid = uuid4().hex
        response = TestClient(app).post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 401

    def test_create_directory_no_transit_encryption(self, auth_client: TestClient, test_user_vault_folder: Path):
        uuid = uuid4().hex
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

    def test_create_directory_transit_encryption(self, auth_client: TestClient, test_user_vault_folder: Path):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        uuid = uuid4().hex
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(f"test-dir-{uuid}".encode("UTF-8"))
        response = auth_client.post(
            f"/api/files/mkdir/.?name=test-{uuid}", headers=headers, content=transit_encrypted_data
        )
        assert response.status_code == 201
        assert ExEF.validate(response.content), "Did not return an encrypted response"
        assert ExEF(b"one demo 16B key").decrypt(response.content) == b"Directory created"
        assert (test_user_vault_folder / f"test-dir-{uuid}").exists()

    def test_path_not_found(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/fake/path", json="test-dir")
        assert response.status_code == 404

    def test_path_too_long(self, auth_client: TestClient):
        response = auth_client.post("/api/files/mkdir/.", json="test-" + "a" * 1000)
        assert response.status_code == 414

    def test_path_traversal(self, auth_client: TestClient):
        # Path is invalid
        response = auth_client.post("/api/files/mkdir/%2E%2E", json="test-dir")
        assert response.status_code == 406

        # Directory name is invalid
        response = auth_client.post("/api/files/mkdir/.", json="../fake-dir")
        assert response.status_code == 406

    def test_directory_already_exists(self, auth_client: TestClient, test_user_vault_folder: Path):
        uuid = uuid4().hex
        (test_user_vault_folder / f"test-dir-{uuid}").mkdir()
        response = auth_client.post("/api/files/mkdir/.", json=f"test-dir-{uuid}")
        assert response.status_code == 409
