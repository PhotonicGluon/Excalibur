import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem


def _decrypt(response) -> list[dict]:
    assert ExEF.validate(response.content), "Did not return an encrypted response"
    return json.loads(ExEF(b"one demo 16B key").decrypt(response.content))


class TestSubtree:
    @pytest.fixture
    def tree(self, test_user, db_session: Session) -> dict[str, FSItem]:
        root_id = test_user["root_id"]

        def folder(name: str, parent: FSItem) -> FSItem:
            return FSItem(parent_id=parent.id, root_id=root_id, name=name, is_folder=True)

        def file(name: str, parent: FSItem) -> FSItem:
            return FSItem(parent_id=parent.id, root_id=root_id, name=name, size=100)

        top = FSItem(parent_id=root_id, root_id=root_id, name="subtree-dir", is_folder=True)
        a = file("a.txt.exef", top)
        empty = folder("empty-dir", top)
        sub = folder("sub-dir", top)
        b = file("b.txt.exef", sub)
        subsub = folder("subsub-dir", sub)
        c = file("c.txt.exef", subsub)

        items = {"top": top, "a": a, "empty": empty, "sub": sub, "b": b, "subsub": subsub, "c": c}
        db_session.add_all(items.values())
        db_session.commit()
        yield items

        # Clean up
        for item in reversed(items.values()):
            if get_item(item.id) is not None:
                db_session.delete(item)
        db_session.commit()

    def _get_subtree(self, auth_client: TestClient, item_id) -> list[dict]:
        response = auth_client.get(f"/api/files/subtree/{item_id}")
        assert response.status_code == 200, response.content
        return _decrypt(response)

    def test_no_auth(self):
        response = TestClient(app).get(f"/api/files/subtree/{uuid4()}")
        assert response.status_code == 401

    def test_not_found(self, auth_client: TestClient):
        response = auth_client.get(f"/api/files/subtree/{uuid4()}")
        assert response.status_code == 404

    def test_not_a_folder(self, auth_client: TestClient, tree: dict[str, FSItem]):
        response = auth_client.get(f"/api/files/subtree/{tree['a'].id}")
        assert response.status_code == 400

    def test_top_folder(self, auth_client: TestClient, tree: dict[str, FSItem]):
        items = self._get_subtree(auth_client, tree["top"].id)

        # Top folder itself should not be included
        assert str(tree["top"].id) not in [item["id"] for item in items]

        assert {item["fullpath"]: item["type"] for item in items} == {
            "subtree-dir/a.txt.exef": "file",
            "subtree-dir/empty-dir": "directory",
            "subtree-dir/sub-dir": "directory",
            "subtree-dir/sub-dir/b.txt.exef": "file",
            "subtree-dir/sub-dir/subsub-dir": "directory",
            "subtree-dir/sub-dir/subsub-dir/c.txt.exef": "file",
        }
        assert all(item["fullpath"].endswith(item["name"]) for item in items)

    def test_sub_folder(self, auth_client: TestClient, tree: dict[str, FSItem]):
        items = self._get_subtree(auth_client, tree["sub"].id)
        assert {item["fullpath"] for item in items} == {
            "subtree-dir/sub-dir/b.txt.exef",
            "subtree-dir/sub-dir/subsub-dir",
            "subtree-dir/sub-dir/subsub-dir/c.txt.exef",
        }

    def test_sub_sub_folder(self, auth_client: TestClient, tree: dict[str, FSItem]):
        items = self._get_subtree(auth_client, tree["subsub"].id)
        assert [item["fullpath"] for item in items] == ["subtree-dir/sub-dir/subsub-dir/c.txt.exef"]

    def test_empty_folder(self, auth_client: TestClient, tree: dict[str, FSItem]):
        assert self._get_subtree(auth_client, tree["empty"].id) == []

    def test_root(self, auth_client: TestClient, test_user, tree: dict[str, FSItem]):
        items = self._get_subtree(auth_client, test_user["root_id"])

        # Should be exactly the items that "Get All Items" returns
        all_items = _decrypt(auth_client.get("/api/files/all"))
        assert {item["id"] for item in items} == {item["id"] for item in all_items}
        assert {item["fullpath"] for item in items} == {item["fullpath"] for item in all_items}

    def test_entries_match_get_all(self, auth_client: TestClient, tree: dict[str, FSItem]):
        items = {item["id"]: item for item in self._get_subtree(auth_client, tree["top"].id)}

        all_items = {item["id"]: item for item in _decrypt(auth_client.get("/api/files/all"))}
        assert items.keys() <= all_items.keys()
        for item_id, item in items.items():
            assert item == all_items[item_id]
