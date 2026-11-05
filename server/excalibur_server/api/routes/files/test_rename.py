import json
from base64 import b64decode, b64encode
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import add_item, get_item, remove_item
from excalibur_server.src.db.tables import FSItem


class TestRename:
    @pytest.fixture
    def rename_folder(self, test_user, db_session: Session, name_fields) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        rename_folder = FSItem(
            parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "rename-folder")
        )
        db_session.add(rename_folder)

        # Commit and yield only the containing folder
        db_session.commit()
        yield rename_folder

        # Clean up
        if get_item(rename_folder.id) is not None:
            db_session.delete(rename_folder)
            db_session.commit()

    @pytest.fixture
    def file(self, test_user, db_session: Session, rename_folder: FSItem, name_fields) -> FSItem:
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=test_user["root_id"],
            **name_fields(rename_folder.id, f"r-{uuid4().hex}"),
        )
        db_session.add(file)
        db_session.commit()
        return file

    def test_no_auth(self):
        response = TestClient(app).post(
            f"/api/files/rename/{uuid4()}",
            json={"name_enc": b64encode(b"a").decode(), "name_tag": b64encode(b"\x01" * 32).decode()},
        )
        assert response.status_code == 401

    def test_rename(self, auth_client: TestClient, rename_folder: FSItem, file: FSItem, encrypted_name):
        new_name = encrypted_name(rename_folder.id, "new-name")

        response = auth_client.post(f"/api/files/rename/{file.id}", json=new_name)
        assert response.status_code == 200

        renamed = get_item(file.id)
        assert renamed.name_enc == b64decode(new_name["name_enc"])
        assert renamed.name_tag == b64decode(new_name["name_tag"])
        assert renamed.parent_id == rename_folder.id

    def test_rename_removes_legacy_name(
        self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem, encrypted_name
    ):
        legacy = FSItem(parent_id=rename_folder.id, root_id=test_user["root_id"], name="legacy.exef")
        db_session.add(legacy)
        db_session.commit()

        response = auth_client.post(f"/api/files/rename/{legacy.id}", json=encrypted_name(rename_folder.id, "new"))
        assert response.status_code == 200
        assert get_item(legacy.id).name is None

    def test_rename_with_encrypted_id(
        self, auth_client: TestClient, rename_folder: FSItem, file: FSItem, encrypted_name
    ):
        new_name = encrypted_name(rename_folder.id, "new-name-enc")

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        id_encrypted = ExEF(b"one demo 16B key").encrypt(str(file.id).encode("utf-8"))
        body_encrypted = ExEF(b"one demo 16B key").encrypt(json.dumps(new_name).encode("utf-8"))

        # Make request
        response = auth_client.post(
            f"/api/files/rename/{b64encode(id_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=body_encrypted,
        )

        assert response.status_code == 200
        assert get_item(file.id).name_tag == b64decode(new_name["name_tag"])

    def test_rename_folder_keeps_descendants(
        self,
        auth_client: TestClient,
        test_user,
        db_session: Session,
        rename_folder: FSItem,
        name_fields,
        encrypted_name,
    ):
        root_id = test_user["root_id"]

        folder = FSItem(
            parent_id=rename_folder.id, root_id=root_id, is_folder=True, **name_fields(rename_folder.id, "nested")
        )
        child = FSItem(parent_id=folder.id, root_id=root_id, **name_fields(folder.id, "child"))
        db_session.add_all([folder, child])
        db_session.commit()
        child_tag = child.name_tag

        response = auth_client.post(f"/api/files/rename/{folder.id}", json=encrypted_name(rename_folder.id, "changed"))
        assert response.status_code == 200

        # Child tags are bound to the parent's ID, not its name, so they do not change
        assert get_item(child.id).parent_id == folder.id
        assert get_item(child.id).name_tag == child_tag

    def test_rename_nonexistent(self, auth_client: TestClient, encrypted_name):
        response = auth_client.post(f"/api/files/rename/{uuid4()}", json=encrypted_name(uuid4(), "new-name"))
        assert response.status_code == 404

    def test_rename_item_of_another_user(self, auth_client: TestClient, db_session: Session, encrypted_name):
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        other_item = FSItem(parent_id=other_root.id, root_id=other_root.id, name_enc=b"orig", name_tag=b"\x0a" * 32)
        db_session.add_all([other_root, other_item])
        db_session.commit()

        try:
            response = auth_client.post(f"/api/files/rename/{other_item.id}", json=encrypted_name(other_root.id, "x"))
            assert response.status_code == 404
            assert get_item(other_item.id).name_enc == b"orig"
        finally:
            db_session.delete(other_item)
            db_session.delete(other_root)
            db_session.commit()

    def test_already_exists(
        self,
        auth_client: TestClient,
        test_user,
        db_session: Session,
        rename_folder: FSItem,
        file: FSItem,
        name_fields,
        encrypted_name,
    ):
        existing_file = FSItem(
            parent_id=rename_folder.id, root_id=test_user["root_id"], **name_fields(rename_folder.id, "existent")
        )
        db_session.add(existing_file)
        db_session.commit()

        # Try to rename file to existing name
        response = auth_client.post(f"/api/files/rename/{file.id}", json=encrypted_name(rename_folder.id, "existent"))
        assert response.status_code == 409  # Item already exists

    def test_rename_root(self, auth_client: TestClient, test_user, encrypted_name):
        root_id = test_user["root_id"]
        response = auth_client.post(f"/api/files/rename/{root_id}", json=encrypted_name(root_id, "new-name"))
        assert response.status_code == 412  # Cannot rename root

    def test_invalid_name_fields(self, auth_client: TestClient, file: FSItem):
        valid = {"name_enc": b64encode(b"a").decode(), "name_tag": b64encode(b"\x01" * 32).decode()}

        assert auth_client.post(f"/api/files/rename/{file.id}", json="plain-name").status_code == 422
        assert auth_client.post(f"/api/files/rename/{file.id}", json={**valid, "name_tag": "AAAA"}).status_code == 422
        assert auth_client.post(f"/api/files/rename/{file.id}", json={**valid, "name_enc": ""}).status_code == 422

        too_big = b64encode(b"x" * (CONFIG.storage.database.max_encrypted_name_size + 1)).decode()
        assert auth_client.post(f"/api/files/rename/{file.id}", json={**valid, "name_enc": too_big}).status_code == 422


class TestRenameMultiple:
    @pytest.fixture
    def rename_folder(self, test_user, db_session: Session, name_fields) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        rename_folder = FSItem(
            parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "rename-multiple-folder")
        )
        db_session.add(rename_folder)

        # Commit and yield only the containing folder
        db_session.commit()
        yield rename_folder

        # Clean up
        if get_item(rename_folder.id) is not None:
            db_session.delete(rename_folder)
            db_session.commit()

    @pytest.fixture
    def items(
        self, test_user, db_session: Session, rename_folder: FSItem, name_fields
    ) -> tuple[FSItem, FSItem, FSItem]:
        root_id = test_user["root_id"]

        # Create a folder and two files
        folder = FSItem(
            parent_id=rename_folder.id, root_id=root_id, is_folder=True, **name_fields(rename_folder.id, "m-folder")
        )
        file_1 = FSItem(parent_id=rename_folder.id, root_id=root_id, **name_fields(rename_folder.id, "m-file-1"))
        file_2 = FSItem(parent_id=folder.id, root_id=root_id, **name_fields(folder.id, "m-file-2"))
        db_session.add_all([folder, file_1, file_2])
        db_session.commit()

        return folder, file_1, file_2

    def test_no_auth(self):
        body = {str(uuid4()): {"name_enc": b64encode(b"a").decode(), "name_tag": b64encode(b"\x01" * 32).decode()}}
        response = TestClient(app).post("/api/files/rename-multiple", json=body)
        assert response.status_code == 401

    def test_rename_multiple(self, auth_client: TestClient, rename_folder: FSItem, items, encrypted_name):
        folder, file_1, file_2 = items

        body = {
            str(folder.id): encrypted_name(rename_folder.id, "new-folder"),
            str(file_1.id): encrypted_name(rename_folder.id, "new-file-1"),
            str(file_2.id): encrypted_name(folder.id, "new-file-2"),
        }
        response = auth_client.post("/api/files/rename-multiple", json=body)
        assert response.status_code == 200
        for item in items:
            renamed = get_item(item.id)
            assert renamed.name_enc == b64decode(body[str(item.id)]["name_enc"])
            assert renamed.name_tag == b64decode(body[str(item.id)]["name_tag"])
            assert renamed.parent_id == item.parent_id

    def test_rename_multiple_with_encrypted_body(
        self, auth_client: TestClient, rename_folder: FSItem, items, encrypted_name
    ):
        folder, file_1, file_2 = items

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        body = {
            str(file_1.id): encrypted_name(rename_folder.id, "enc-file-1"),
            str(file_2.id): encrypted_name(folder.id, "enc-file-2"),
        }
        body_encrypted = ExEF(b"one demo 16B key").encrypt(json.dumps(body).encode("utf-8"))

        # Make request
        response = auth_client.post("/api/files/rename-multiple", headers=headers, content=body_encrypted)

        assert response.status_code == 200
        assert get_item(file_1.id).name_tag == b64decode(body[str(file_1.id)]["name_tag"])
        assert get_item(file_2.id).name_tag == b64decode(body[str(file_2.id)]["name_tag"])

    def test_rename_nothing(self, auth_client: TestClient):
        response = auth_client.post("/api/files/rename-multiple", json={})
        assert response.status_code == 200

    def test_invalid_name_changes_nothing(self, auth_client: TestClient, rename_folder: FSItem, items, encrypted_name):
        folder, file_1, _ = items
        original = get_item(folder.id).name_tag

        response = auth_client.post(
            "/api/files/rename-multiple",
            json={
                str(folder.id): encrypted_name(rename_folder.id, "valid-name"),
                str(file_1.id): {"name_enc": "", "name_tag": "AAAA"},
            },
        )
        assert response.status_code == 422
        assert get_item(folder.id).name_tag == original

    def test_rename_nonexistent_changes_nothing(
        self, auth_client: TestClient, rename_folder: FSItem, items, encrypted_name
    ):
        folder, _, _ = items
        original = get_item(folder.id).name_tag

        response = auth_client.post(
            "/api/files/rename-multiple",
            json={
                str(folder.id): encrypted_name(rename_folder.id, "valid-name"),
                str(uuid4()): encrypted_name(rename_folder.id, "x"),
            },
        )
        assert response.status_code == 404
        assert get_item(folder.id).name_tag == original

    def test_rename_item_of_another_user(
        self, auth_client: TestClient, db_session: Session, rename_folder: FSItem, items, encrypted_name
    ):
        folder, _, _ = items
        original = get_item(folder.id).name_tag

        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        other_item = FSItem(parent_id=other_root.id, root_id=other_root.id, name_enc=b"orig", name_tag=b"\x0b" * 32)
        db_session.add_all([other_root, other_item])
        db_session.commit()

        try:
            response = auth_client.post(
                "/api/files/rename-multiple",
                json={
                    str(folder.id): encrypted_name(rename_folder.id, "valid-name"),
                    str(other_item.id): encrypted_name(other_root.id, "x"),
                },
            )
            assert response.status_code == 404
            assert get_item(folder.id).name_tag == original
            assert get_item(other_item.id).name_enc == b"orig"
        finally:
            db_session.delete(other_item)
            db_session.delete(other_root)
            db_session.commit()

    def test_rename_root(self, auth_client: TestClient, test_user, encrypted_name):
        root_id = test_user["root_id"]
        response = auth_client.post(
            "/api/files/rename-multiple", json={str(root_id): encrypted_name(root_id, "new-name")}
        )
        assert response.status_code == 412  # Cannot rename root

    def test_already_exists_changes_nothing(
        self,
        auth_client: TestClient,
        test_user,
        db_session: Session,
        rename_folder: FSItem,
        items,
        name_fields,
        encrypted_name,
    ):
        folder, file_1, _ = items
        original = (get_item(folder.id).name_tag, get_item(file_1.id).name_tag)
        existing_file = FSItem(
            parent_id=rename_folder.id, root_id=test_user["root_id"], **name_fields(rename_folder.id, "existing")
        )
        db_session.add(existing_file)
        db_session.commit()

        response = auth_client.post(
            "/api/files/rename-multiple",
            json={
                str(folder.id): encrypted_name(rename_folder.id, "valid-name"),
                str(file_1.id): encrypted_name(rename_folder.id, "existing"),
            },
        )
        assert response.status_code == 409  # Item already exists
        assert (get_item(folder.id).name_tag, get_item(file_1.id).name_tag) == original

    def test_duplicate_new_names(
        self,
        auth_client: TestClient,
        test_user,
        db_session: Session,
        rename_folder: FSItem,
        name_fields,
        encrypted_name,
    ):
        root_id = test_user["root_id"]
        file_1 = FSItem(parent_id=rename_folder.id, root_id=root_id, **name_fields(rename_folder.id, "d-file-1"))
        file_2 = FSItem(parent_id=rename_folder.id, root_id=root_id, **name_fields(rename_folder.id, "d-file-2"))
        db_session.add_all([file_1, file_2])
        db_session.commit()
        originals = (file_1.name_tag, file_2.name_tag)

        # Both files cannot be called the same thing in the same folder
        same = encrypted_name(rename_folder.id, "same")
        response = auth_client.post("/api/files/rename-multiple", json={str(file_1.id): same, str(file_2.id): same})
        assert response.status_code == 409
        assert (get_item(file_1.id).name_tag, get_item(file_2.id).name_tag) == originals


class TestRenameMerkleEffects:
    @pytest.fixture
    def renameable_file(self, test_user, name_fields) -> FSItem:
        root_id = test_user["root_id"]

        folder = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "merkle-rename"))
        file = FSItem(parent_id=folder.id, root_id=root_id, size=1, **name_fields(folder.id, "merkle-rename.txt"))
        folder_id, file_id = folder.id, file.id

        add_item(folder)
        add_item(file)

        yield get_item(file_id)

        for item_id in (file_id, folder_id):
            if get_item(item_id) is not None:
                remove_item(item_id)

    def test_rename_marks_the_chain_dirty(
        self, test_user, auth_client: TestClient, renameable_file: FSItem, mark_clean, assert_dirty, encrypted_name
    ):
        root_id = test_user["root_id"]
        folder_id = renameable_file.parent_id

        mark_clean(renameable_file.id)
        item_version = get_item(renameable_file.id).version
        folder_version = get_item(folder_id).version
        root_version = get_item(root_id).version

        new_name = encrypted_name(folder_id, "merkle-renamed.txt")
        response = auth_client.post(f"/api/files/rename/{renameable_file.id}", json=new_name)
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        assert get_item(renameable_file.id).name_tag == b64decode(new_name["name_tag"])
        assert_dirty(renameable_file.id, item_version)
        assert_dirty(folder_id, folder_version)
        assert_dirty(root_id, root_version)

    def test_rename_multiple_marks_the_chain_dirty(
        self, test_user, auth_client: TestClient, renameable_file: FSItem, mark_clean, assert_dirty, encrypted_name
    ):
        root_id = test_user["root_id"]
        folder_id = renameable_file.parent_id

        mark_clean(renameable_file.id)
        item_version = get_item(renameable_file.id).version
        folder_version = get_item(folder_id).version
        root_version = get_item(root_id).version

        new_file_name = encrypted_name(folder_id, "merkle-renamed-multiple.txt")
        response = auth_client.post(
            "/api/files/rename-multiple",
            json={
                str(renameable_file.id): new_file_name,
                str(folder_id): encrypted_name(root_id, "merkle-renamed-folder"),
            },
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        assert get_item(renameable_file.id).name_tag == b64decode(new_file_name["name_tag"])
        assert_dirty(renameable_file.id, item_version)
        assert_dirty(folder_id, folder_version)
        assert_dirty(root_id, root_version)
