import json
from base64 import b64encode

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_items_in_folder


class TestInclusionProofEndpoint:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/proof/some-id")
        assert response.status_code == 401

    def test_get_root(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        response = auth_client.get(f"/api/merkle/proof/{root_id}")
        assert response.status_code == 200

        inclusion_proof = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert inclusion_proof["item"] == get_item(root_id).model_dump()
        assert len(inclusion_proof["steps"]) == 0

    def test_get_item_in_root(self, test_user, auth_client: TestClient, merkle_folder: dict):
        root_id = test_user["root_id"]
        top_folder_id = merkle_folder["top_folder"]

        response = auth_client.get(f"/api/merkle/proof/{top_folder_id}")
        assert response.status_code == 200

        inclusion_proof = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        actual_top_folder = get_item(top_folder_id)
        assert inclusion_proof["item"] == actual_top_folder.model_dump(mode="json")
        assert len(inclusion_proof["steps"]) == 1
        step = inclusion_proof["steps"][0]
        assert step["id"] == str(root_id)
        assert len(step["children"]) == len(get_items_in_folder(root_id))
        top_folder_idx = [child[0] for child in step["children"]].index(str(actual_top_folder.id))
        assert step["children"][top_folder_idx] == [
            str(actual_top_folder.id),
            b64encode(actual_top_folder.node_hash).decode("utf-8"),
        ]

    def test_get_item_in_folder(self, test_user, auth_client: TestClient, merkle_folder: dict):
        root_id = test_user["root_id"]
        top_folder_id = merkle_folder["top_folder"]
        sub_folder_id = merkle_folder["sub_folder"]

        response = auth_client.get(f"/api/merkle/proof/{sub_folder_id}")
        assert response.status_code == 200

        inclusion_proof = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        actual_sub_folder = get_item(sub_folder_id)
        assert inclusion_proof["item"] == actual_sub_folder.model_dump(mode="json")
        assert len(inclusion_proof["steps"]) == 2

        step_1 = inclusion_proof["steps"][0]
        assert step_1["id"] == str(top_folder_id)
        assert len(step_1["children"]) == len(get_items_in_folder(top_folder_id))

        step_2 = inclusion_proof["steps"][1]
        assert step_2["id"] == str(root_id)
        assert len(step_2["children"]) == len(get_items_in_folder(root_id))

    def test_get_item_in_sub_folder(self, auth_client: TestClient, merkle_folder: dict):
        sub_sub_folder_id = merkle_folder["sub_sub_folder"]

        response = auth_client.get(f"/api/merkle/proof/{sub_sub_folder_id}")
        assert response.status_code == 200

        inclusion_proof = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        actual_sub_sub_folder = get_item(sub_sub_folder_id)
        assert inclusion_proof["item"] == actual_sub_sub_folder.model_dump(mode="json")
        assert len(inclusion_proof["steps"]) == 3
