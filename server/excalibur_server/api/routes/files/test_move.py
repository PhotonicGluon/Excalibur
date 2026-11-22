import json
from base64 import b64decode, b64encode
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import add_item, get_item, get_item_by_name_tag, remove_item
from excalibur_server.src.db.tables import FSItem


@pytest.fixture
def move_body(encrypted_name):
    """
    :returns: helper that builds a move request body, where the item has the name `name`
    """

    def _move_body(dest_id: UUID | str, name: str) -> dict:
        # Tags are bound to the parent, so we compute the tag as if the item were in the destination
        tag_parent = UUID(str(dest_id)) if dest_id != "." else UUID(int=0)
        return {"dest_id": str(dest_id), "name_tag": encrypted_name(tag_parent, name)["name_tag"]}

    return _move_body


class TestMove:
    def _make_file(self, db_session: Session, root_id, parent: FSItem, name: str, name_fields) -> FSItem:
        file = FSItem(parent_id=parent.id, root_id=root_id, is_folder=False, **name_fields(parent.id, name))
        db_session.add(file)
        db_session.commit()
        return file

    @pytest.fixture()
    def move_folder(self, test_user, db_session: Session, name_fields) -> tuple[FSItem, FSItem]:
        """
        :yields: a folder that contains the test items, and a folder inside it that items can be moved into
        """

        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        containing_folder = FSItem(
            parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "move-folder")
        )
        db_session.add(containing_folder)

        # Create a folder that we can move items into
        move_into = FSItem(
            parent_id=containing_folder.id,
            root_id=root_id,
            is_folder=True,
            **name_fields(containing_folder.id, "move-into"),
        )
        db_session.add(move_into)

        db_session.commit()
        yield containing_folder, move_into

        # Clean up
        if get_item(containing_folder.id) is not None:
            db_session.delete(move_into)
            db_session.delete(containing_folder)
            db_session.commit()

    def test_no_auth(self):
        body = {"dest_id": str(uuid4()), "name_tag": b64encode(b"\x01" * 32).decode()}
        response = TestClient(app).post(f"/api/files/move/{uuid4()}", json=body)
        assert response.status_code == 401

    def test_move(self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body):
        containing, move_into = move_folder
        file = self._make_file(db_session, test_user["root_id"], containing, "m-file", name_fields)
        original_enc = file.name_enc

        body = move_body(move_into.id, "m-file")
        response = auth_client.post(f"/api/files/move/{file.id}", json=body)
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content).decode("UTF-8")

        # The parent and the tag changed, but not the encrypted name
        moved = get_item(file.id)
        assert moved.parent_id == move_into.id
        assert moved.name_tag == b64decode(body["name_tag"])
        assert moved.name_enc == original_enc
        assert get_item_by_name_tag(move_into.id, b64decode(body["name_tag"])).id == file.id

    def test_move_into_root(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        root_id = test_user["root_id"]
        file = self._make_file(db_session, root_id, move_folder[0], "m-file-root", name_fields)

        response = auth_client.post(f"/api/files/move/{file.id}", json=move_body(root_id, "m-file-root"))
        assert response.status_code == 200
        assert get_item(file.id).parent_id == root_id

    def test_move_into_root_with_dot(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, encrypted_name
    ):
        root_id = test_user["root_id"]
        file = self._make_file(db_session, root_id, move_folder[0], "m-file-dot", name_fields)

        body = {"dest_id": ".", "name_tag": encrypted_name(root_id, "m-file-dot")["name_tag"]}
        response = auth_client.post(f"/api/files/move/{file.id}", json=body)
        assert response.status_code == 200
        assert get_item(file.id).parent_id == root_id

    def test_move_with_encrypted_ids(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        containing, move_into = move_folder
        file = self._make_file(db_session, test_user["root_id"], containing, "m-file-enc", name_fields)

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        id_encrypted = ExEF(b"one demo 16B key").encrypt(str(file.id).encode("utf-8"))
        body = move_body(move_into.id, "m-file-enc")
        body_encrypted = ExEF(b"one demo 16B key").encrypt(json.dumps(body).encode("utf-8"))

        # Make request
        response = auth_client.post(
            f"/api/files/move/{b64encode(id_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=body_encrypted,
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content).decode("UTF-8")
        assert get_item(file.id).parent_id == move_into.id

    def test_move_nonexistent(self, auth_client: TestClient, move_body):
        response = auth_client.post(f"/api/files/move/{uuid4()}", json=move_body(uuid4(), "x"))
        assert response.status_code == 404

    def test_move_item_of_another_user(self, auth_client: TestClient, test_user, db_session: Session, move_body):
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        other_item = FSItem(parent_id=other_root.id, root_id=other_root.id, name_enc=b"orig", name_tag=b"\x0c" * 32)
        db_session.add_all([other_root, other_item])
        db_session.commit()

        try:
            response = auth_client.post(f"/api/files/move/{other_item.id}", json=move_body(test_user["root_id"], "x"))
            assert response.status_code == 404
            assert get_item(other_item.id).parent_id == other_root.id
        finally:
            db_session.delete(other_item)
            db_session.delete(other_root)
            db_session.commit()

    def test_move_into_folder_of_another_user(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        file = self._make_file(db_session, test_user["root_id"], move_folder[0], "m-file-foreign-dest", name_fields)
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        db_session.add(other_root)
        db_session.commit()

        try:
            response = auth_client.post(
                f"/api/files/move/{file.id}", json=move_body(other_root.id, "m-file-foreign-dest")
            )
            assert response.status_code == 404
            assert get_item(file.id).parent_id == move_folder[0].id
        finally:
            db_session.delete(other_root)
            db_session.commit()

    def test_dest_same_as_current(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        containing, _ = move_folder
        file = self._make_file(db_session, test_user["root_id"], containing, "m-file-same-as-current", name_fields)

        response = auth_client.post(
            f"/api/files/move/{file.id}", json=move_body(containing.id, "m-file-same-as-current")
        )
        assert response.status_code == 409  # Item already exists

    def test_already_exists(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        root_id = test_user["root_id"]
        file = self._make_file(db_session, root_id, move_folder[0], "m-file-already-exists", name_fields)
        original_tag = file.name_tag
        existing_file = FSItem(parent_id=root_id, root_id=root_id, **name_fields(root_id, "m-file-already-exists"))
        db_session.add(existing_file)
        db_session.commit()

        response = auth_client.post(f"/api/files/move/{file.id}", json=move_body(root_id, "m-file-already-exists"))
        assert response.status_code == 409  # Item already exists

        # Nothing changed
        assert get_item(file.id).parent_id == move_folder[0].id
        assert get_item(file.id).name_tag == original_tag

    def test_destination_nonexistent(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        file = self._make_file(db_session, test_user["root_id"], move_folder[0], "m-file-dest-dne", name_fields)

        response = auth_client.post(f"/api/files/move/{file.id}", json=move_body(uuid4(), "m-file-dest-dne"))
        assert response.status_code == 404  # Destination not found

    def test_destination_is_a_file(
        self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields, move_body
    ):
        root_id = test_user["root_id"]
        file = self._make_file(db_session, root_id, move_folder[0], "m-file-dest-file", name_fields)
        other_file = FSItem(parent_id=root_id, root_id=root_id, **name_fields(root_id, "m-other-file"))
        db_session.add(other_file)
        db_session.commit()

        response = auth_client.post(f"/api/files/move/{file.id}", json=move_body(other_file.id, "m-file-dest-file"))
        assert response.status_code == 404  # Destination is not a folder

    def test_move_root(self, auth_client: TestClient, test_user, move_folder, move_body):
        response = auth_client.post(f"/api/files/move/{test_user['root_id']}", json=move_body(move_folder[0].id, "x"))
        assert response.status_code == 412  # Cannot move root

    def test_invalid_tag(self, auth_client: TestClient, test_user, db_session: Session, move_folder, name_fields):
        containing, move_into = move_folder
        file = self._make_file(db_session, test_user["root_id"], containing, "m-file-bad-tag", name_fields)

        for body in (
            {"dest_id": str(move_into.id), "name_tag": b64encode(b"short").decode()},
            {"dest_id": str(move_into.id)},
            str(move_into.id),  # The old body format
        ):
            assert auth_client.post(f"/api/files/move/{file.id}", json=body).status_code == 422
        assert get_item(file.id).parent_id == containing.id


class TestMoveIntoSubtree:
    @pytest.fixture
    def tree(self, test_user, name_fields) -> dict[str, FSItem]:
        """
        top
        ├── child
        │   └── grandchild
        └── sibling
        """

        root_id = test_user["root_id"]

        top = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "subtree-top"))
        child = FSItem(parent_id=top.id, root_id=root_id, is_folder=True, **name_fields(top.id, "child"))
        grandchild = FSItem(parent_id=child.id, root_id=root_id, is_folder=True, **name_fields(child.id, "grandchild"))
        sibling = FSItem(parent_id=top.id, root_id=root_id, is_folder=True, **name_fields(top.id, "sibling"))
        items = {"top": top, "child": child, "grandchild": grandchild, "sibling": sibling}
        ids = {key: item.id for key, item in items.items()}
        try:
            for item in items.values():
                add_item(item)

            # `add_item` detaches the instances, so hand out fresh copies
            yield {key: get_item(item_id) for key, item_id in ids.items()}
        finally:
            for key in ("grandchild", "sibling", "child", "top"):
                if get_item(ids[key]) is not None:
                    remove_item(ids[key])

    def test_into_itself(self, auth_client: TestClient, tree, move_body):
        response = auth_client.post(f"/api/files/move/{tree['child'].id}", json=move_body(tree["child"].id, "child"))
        assert response.status_code == 412
        assert get_item(tree["child"].id).parent_id == tree["top"].id

    def test_into_child(self, auth_client: TestClient, tree, move_body):
        response = auth_client.post(
            f"/api/files/move/{tree['top'].id}", json=move_body(tree["child"].id, "subtree-top")
        )
        assert response.status_code == 412
        assert get_item(tree["top"].id).parent_id != tree["child"].id

    def test_into_grandchild(self, auth_client: TestClient, tree, move_body):
        response = auth_client.post(
            f"/api/files/move/{tree['top'].id}", json=move_body(tree["grandchild"].id, "subtree-top")
        )
        assert response.status_code == 412
        assert get_item(tree["top"].id).parent_id != tree["grandchild"].id

    def test_into_sibling_is_allowed(self, auth_client: TestClient, tree, move_body):
        response = auth_client.post(f"/api/files/move/{tree['child'].id}", json=move_body(tree["sibling"].id, "child"))
        assert response.status_code == 200
        assert get_item(tree["child"].id).parent_id == tree["sibling"].id

    def test_into_parent_of_ancestor_is_allowed(self, auth_client: TestClient, test_user, tree, move_body):
        # Moving a deep folder up to the root is fine
        root_id = test_user["root_id"]
        response = auth_client.post(f"/api/files/move/{tree['grandchild'].id}", json=move_body(root_id, "grandchild"))
        assert response.status_code == 200
        assert get_item(tree["grandchild"].id).parent_id == root_id


class TestMoveMerkleEffects:
    @pytest.fixture
    def move_tree(self, test_user, name_fields) -> dict:
        root_id = test_user["root_id"]

        source = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "merkle-move-src"))
        destination = FSItem(
            parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "merkle-move-dst")
        )
        item = FSItem(parent_id=source.id, root_id=root_id, size=1, **name_fields(source.id, "merkle-move.txt"))
        ids = {"source": source.id, "destination": destination.id, "item": item.id}

        add_item(source)
        add_item(destination)
        add_item(item)

        yield ids

        for key in ("item", "destination", "source"):
            if get_item(ids[key]) is not None:
                remove_item(ids[key])

    def test_move_marks_both_chains_dirty(
        self, test_user, auth_client: TestClient, move_tree: dict, mark_clean, assert_dirty, move_body
    ):
        root_id = test_user["root_id"]

        mark_clean(move_tree["item"])
        mark_clean(move_tree["destination"])

        source_version = get_item(move_tree["source"]).version
        destination_version = get_item(move_tree["destination"]).version
        item_version = get_item(move_tree["item"]).version

        response = auth_client.post(
            f"/api/files/move/{move_tree['item']}", json=move_body(move_tree["destination"], "merkle-move.txt")
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        assert get_item(move_tree["item"]).parent_id == move_tree["destination"]

        # Both the folder the item left and the folder it arrived in are now dirty
        assert_dirty(move_tree["source"], source_version)
        assert_dirty(move_tree["destination"], destination_version)
        assert_dirty(move_tree["item"], item_version)
        assert get_item(root_id).node_hash is None
