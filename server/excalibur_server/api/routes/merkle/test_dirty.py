import json

from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_unverified, has_unverified


def _decrypt(response) -> bytes:
    return ExEF(b"one demo 16B key").decrypt(response.content)


class TestHasDirty:
    def test_no_auth(self):
        response = TestClient(app).head("/api/merkle/dirty")
        assert response.status_code == 401

    def test_head(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        response = auth_client.head("/api/merkle/dirty")
        assert (response.status_code == 200) == has_unverified(root_id)


class TestGetDirty:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/dirty")
        assert response.status_code == 401

    def test_get(self, test_user, auth_client: TestClient, merkle_folder):
        root_id = test_user["root_id"]

        response = auth_client.get("/api/merkle/dirty")
        assert response.status_code == 200

        gotten_dirty = json.loads(_decrypt(response))
        assert {item["id"] for item in gotten_dirty} == {str(u) for u in get_unverified(root_id)}

    def test_get_includes_node_metadata(self, test_user, auth_client: TestClient, merkle_folder):
        response = auth_client.get("/api/merkle/dirty")
        assert response.status_code == 200

        gotten_dirty = json.loads(_decrypt(response))
        assert len(gotten_dirty) > 0

        for entry in gotten_dirty:
            item = get_item(entry["id"])
            assert entry["name"] == item.name
            assert entry["is_folder"] == item.is_folder
            assert entry["version"] == item.version
            assert entry["parent_id"] == (str(item.parent_id) if item.parent_id else None)
            assert entry["needs_content_mac"] == (not item.is_folder and item.content_mac is None)

    def test_get_is_sorted_by_id(self, auth_client: TestClient, merkle_folder):
        response = auth_client.get("/api/merkle/dirty")
        assert response.status_code == 200

        ids = [entry["id"] for entry in json.loads(_decrypt(response))]
        assert ids == sorted(ids)

    def test_get_paged(self, auth_client: TestClient, merkle_folder):
        response = auth_client.get("/api/merkle/dirty")
        all_ids = [entry["id"] for entry in json.loads(_decrypt(response))]
        assert len(all_ids) >= 2  # Otherwise there is nothing to page through

        response = auth_client.get("/api/merkle/dirty", params={"limit": 1})
        assert response.status_code == 200
        assert [entry["id"] for entry in json.loads(_decrypt(response))] == all_ids[:1]

        response = auth_client.get("/api/merkle/dirty", params={"limit": 1, "offset": 1})
        assert response.status_code == 200
        assert [entry["id"] for entry in json.loads(_decrypt(response))] == all_ids[1:2]

    def test_reject_bad_paging(self, auth_client: TestClient):
        assert auth_client.get("/api/merkle/dirty", params={"limit": 0}).status_code == 422
        assert auth_client.get("/api/merkle/dirty", params={"offset": -1}).status_code == 422
