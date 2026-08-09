import json
from base64 import b64encode
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.crypto.merkle.mac import get_content_mac_input


class TestContentMACInputs:
    def test_no_auth(self):
        response = TestClient(app).post("/api/merkle/content-mac-inputs", json={"ids": ["sample"]})
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "files",
        [[1], [2], [1, 2], ["fake"], ["fake", 1], ["fake", 1, 2, "fake"]],
    )
    def test_get_files(self, auth_client: TestClient, merkle_files_with_content, files: list[int]):
        ids = []
        expected_content_mac_inputs = {}
        for file in files:
            if isinstance(file, int):
                ids.append(merkle_files_with_content[f"file{file}"][0])
                expected_content_mac_inputs[merkle_files_with_content[f"file{file}"][0]] = b64encode(
                    get_content_mac_input(merkle_files_with_content[f"file{file}"][1])
                ).decode("utf-8")
            else:
                fake_id = str(uuid4())
                ids.append(fake_id)
                expected_content_mac_inputs[fake_id] = None

        response = auth_client.post("/api/merkle/content-mac-inputs", json=ids)
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        content_mac_inputs = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert content_mac_inputs == expected_content_mac_inputs
