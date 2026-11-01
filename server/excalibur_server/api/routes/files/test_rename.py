from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import add_item, get_item, get_item_fullpath, remove_item
from excalibur_server.src.db.tables import FSItem


class TestRename:
    @pytest.fixture
    def rename_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        rename_folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="rename-folder",
            is_folder=True,
        )
        db_session.add(rename_folder)

        # Commit and yield only the containing folder
        db_session.commit()
        yield rename_folder

        # Clean up
        if get_item(rename_folder.id) is not None:
            db_session.delete(rename_folder)
            db_session.commit()

    def test_no_auth(self):
        response = TestClient(app).post(f"/api/files/rename/{uuid4()}", json="new-name")
        assert response.status_code == 401

    def test_rename(self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        # Rename the item
        response = auth_client.post(f"/api/files/rename/{file.id}", json="new-name.exef")
        assert response.status_code == 200
        assert get_item(file.id).name == "new-name.exef"

    def test_rename_with_encrypted_id(
        self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem
    ):
        from base64 import b64encode

        root_id = test_user["root_id"]

        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file-enc",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        id_encrypted = ExEF(b"one demo 16B key").encrypt(str(file.id).encode("utf-8"))
        destination_encrypted = ExEF(b"one demo 16B key").encrypt(b"new-name-enc.exef")

        # Make request
        response = auth_client.post(
            f"/api/files/rename/{b64encode(id_encrypted, altchars=b'-_').decode('utf-8')}",
            headers=headers,
            content=destination_encrypted,
        )

        assert response.status_code == 200
        assert get_item(file.id).name == "new-name-enc.exef"

    def test_rename_nested_item(self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]

        folder = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="nested-folder",
            is_folder=True,
        )
        file = FSItem(
            parent_id=folder.id,
            root_id=root_id,
            name="file",
            is_folder=False,
        )
        db_session.add(folder)
        db_session.add(file)
        db_session.commit()

        # Rename the folder
        response = auth_client.post(f"/api/files/rename/{folder.id}", json="changed-folder-name")
        assert response.status_code == 200
        assert get_item_fullpath(folder.id).as_posix() == "rename-folder/changed-folder-name"
        assert get_item_fullpath(file.id).as_posix() == "rename-folder/changed-folder-name/file"

    def test_rename_deeply_nested_item(
        self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem
    ):
        root_id = test_user["root_id"]

        folder_1 = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="deep-folder-1",
            is_folder=True,
        )
        folder_2 = FSItem(
            parent_id=folder_1.id,
            root_id=root_id,
            name="deep-folder-2",
            is_folder=True,
        )
        folder_3 = FSItem(
            parent_id=folder_2.id,
            root_id=root_id,
            name="deep-folder-3",
            is_folder=True,
        )
        file = FSItem(
            parent_id=folder_3.id,
            root_id=root_id,
            name="file",
            is_folder=False,
        )
        db_session.add(folder_1)
        db_session.add(folder_2)
        db_session.add(folder_3)
        db_session.add(file)
        db_session.commit()

        # Rename only folders 3 and 1
        assert auth_client.post(f"/api/files/rename/{folder_3.id}", json="changed-3").status_code == 200
        assert auth_client.post(f"/api/files/rename/{folder_1.id}", json="changed-1").status_code == 200

        # Check the processing of the fullpath of the file
        assert get_item_fullpath(file.id).as_posix() == "rename-folder/changed-1/deep-folder-2/changed-3/file"

    def test_illegal_name(self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=test_user["root_id"],
            name="r-file-illegal-name",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        response = auth_client.post(f"/api/files/rename/{file.id}", json="illegal/item/name")
        assert response.status_code == 400

    def test_rename_nonexistent(self, auth_client: TestClient):
        response = auth_client.post(f"/api/files/rename/{uuid4()}", json="new-name")
        assert response.status_code == 404

    def test_already_exists(self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]

        # Create test files
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="r-file-already-exists",
            is_folder=False,
        )
        existing_file = FSItem(
            parent_id=rename_folder.id,
            root_id=root_id,
            name="already-existent.exef",
            is_folder=False,
        )
        db_session.add(file)
        db_session.add(existing_file)
        db_session.commit()

        # Try to rename file to existing name
        response = auth_client.post(f"/api/files/rename/{file.id}", json="already-existent.exef")
        assert response.status_code == 409  # Item already exists

    def test_rename_root(self, auth_client: TestClient, test_user):
        response = auth_client.post(f"/api/files/rename/{test_user['root_id']}", json="new-name")
        assert response.status_code == 412  # Cannot rename root

    def test_rename_file_without_exef_extension(
        self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem
    ):
        # Create test file
        file = FSItem(
            parent_id=rename_folder.id,
            root_id=test_user["root_id"],
            name="r-file-no-exef",
            is_folder=False,
        )
        db_session.add(file)
        db_session.commit()

        response = auth_client.post(f"/api/files/rename/{file.id}", json="no-exef")
        assert response.status_code == 417


class TestRenameMultiple:
    @pytest.fixture
    def rename_folder(self, test_user, db_session: Session) -> FSItem:
        root_id = test_user["root_id"]

        # Create a folder that contains the test items
        rename_folder = FSItem(
            parent_id=root_id,
            root_id=root_id,
            name="rename-multiple-folder",
            is_folder=True,
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
    def items(self, test_user, db_session: Session, rename_folder: FSItem) -> tuple[FSItem, FSItem, FSItem]:
        root_id = test_user["root_id"]

        # Create a folder and two files
        folder = FSItem(parent_id=rename_folder.id, root_id=root_id, name="m-folder", is_folder=True)
        file_1 = FSItem(parent_id=rename_folder.id, root_id=root_id, name="m-file-1.exef", is_folder=False)
        file_2 = FSItem(parent_id=folder.id, root_id=root_id, name="m-file-2.exef", is_folder=False)
        db_session.add(folder)
        db_session.add(file_1)
        db_session.add(file_2)
        db_session.commit()

        return folder, file_1, file_2

    def test_no_auth(self):
        response = TestClient(app).post("/api/files/rename-multiple", json={str(uuid4()): "new-name"})
        assert response.status_code == 401

    def test_rename_multiple(self, auth_client: TestClient, items):
        folder, file_1, file_2 = items

        response = auth_client.post(
            "/api/files/rename-multiple",
            json={
                str(folder.id): "new-folder",
                str(file_1.id): "new-file-1.exef",
                str(file_2.id): "new-file-2.exef",
            },
        )
        assert response.status_code == 200
        assert get_item(folder.id).name == "new-folder"
        assert get_item(file_1.id).name == "new-file-1.exef"
        assert get_item(file_2.id).name == "new-file-2.exef"
        assert get_item_fullpath(file_2.id).as_posix() == "rename-multiple-folder/new-folder/new-file-2.exef"

    def test_rename_multiple_with_encrypted_body(self, auth_client: TestClient, items):
        from json import dumps

        _, file_1, file_2 = items

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        body = {str(file_1.id): "enc-file-1.exef", str(file_2.id): "enc-file-2.exef"}
        body_encrypted = ExEF(b"one demo 16B key").encrypt(dumps(body).encode("utf-8"))

        # Make request
        response = auth_client.post("/api/files/rename-multiple", headers=headers, content=body_encrypted)

        assert response.status_code == 200
        assert get_item(file_1.id).name == "enc-file-1.exef"
        assert get_item(file_2.id).name == "enc-file-2.exef"

    def test_rename_nothing(self, auth_client: TestClient):
        response = auth_client.post("/api/files/rename-multiple", json={})
        assert response.status_code == 200

    def test_illegal_name_changes_nothing(self, auth_client: TestClient, items):
        folder, file_1, _ = items

        response = auth_client.post(
            "/api/files/rename-multiple", json={str(folder.id): "valid-name", str(file_1.id): "illegal/name.exef"}
        )
        assert response.status_code == 400
        assert get_item(folder.id).name == "m-folder"
        assert get_item(file_1.id).name == "m-file-1.exef"

    def test_rename_nonexistent_changes_nothing(self, auth_client: TestClient, items):
        folder, _, _ = items

        response = auth_client.post(
            "/api/files/rename-multiple", json={str(folder.id): "valid-name", str(uuid4()): "x"}
        )
        assert response.status_code == 404
        assert get_item(folder.id).name == "m-folder"

    def test_rename_root(self, auth_client: TestClient, test_user):
        response = auth_client.post("/api/files/rename-multiple", json={str(test_user["root_id"]): "new-name"})
        assert response.status_code == 412  # Cannot rename root

    def test_rename_file_without_exef_extension(self, auth_client: TestClient, items):
        folder, file_1, _ = items

        response = auth_client.post(
            "/api/files/rename-multiple", json={str(folder.id): "valid-name", str(file_1.id): "no-exef"}
        )
        assert response.status_code == 417
        assert get_item(folder.id).name == "m-folder"

    def test_already_exists_changes_nothing(
        self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem, items
    ):
        folder, file_1, _ = items
        existing_file = FSItem(
            parent_id=rename_folder.id, root_id=test_user["root_id"], name="existing.exef", is_folder=False
        )
        db_session.add(existing_file)
        db_session.commit()

        response = auth_client.post(
            "/api/files/rename-multiple", json={str(folder.id): "valid-name", str(file_1.id): "existing.exef"}
        )
        assert response.status_code == 409  # Item already exists
        assert get_item(folder.id).name == "m-folder"
        assert get_item(file_1.id).name == "m-file-1.exef"

    def test_duplicate_new_names(self, auth_client: TestClient, test_user, db_session: Session, rename_folder: FSItem):
        root_id = test_user["root_id"]
        file_1 = FSItem(parent_id=rename_folder.id, root_id=root_id, name="d-file-1.exef", is_folder=False)
        file_2 = FSItem(parent_id=rename_folder.id, root_id=root_id, name="d-file-2.exef", is_folder=False)
        db_session.add(file_1)
        db_session.add(file_2)
        db_session.commit()

        # Both files cannot be called the same thing in the same folder
        response = auth_client.post(
            "/api/files/rename-multiple", json={str(file_1.id): "same.exef", str(file_2.id): "same.exef"}
        )
        assert response.status_code == 409
        assert get_item(file_1.id).name == "d-file-1.exef"
        assert get_item(file_2.id).name == "d-file-2.exef"


class TestRenameMerkleEffects:
    @pytest.fixture
    def renameable_file(self, test_user) -> FSItem:
        root_id = test_user["root_id"]

        folder = FSItem(parent_id=root_id, root_id=root_id, name="merkle-rename", is_folder=True)
        file = FSItem(parent_id=folder.id, root_id=root_id, name="merkle-rename.txt.exef", is_folder=False, size=1)
        folder_id, file_id = folder.id, file.id

        add_item(folder)
        add_item(file)

        yield get_item(file_id)

        for item_id in (file_id, folder_id):
            if get_item(item_id) is not None:
                remove_item(item_id)

    def test_rename_marks_the_chain_dirty(
        self, test_user, auth_client: TestClient, renameable_file: FSItem, mark_clean, assert_dirty
    ):
        root_id = test_user["root_id"]
        folder_id = renameable_file.parent_id

        mark_clean(renameable_file.id)
        item_version = get_item(renameable_file.id).version
        folder_version = get_item(folder_id).version
        root_version = get_item(root_id).version

        response = auth_client.post(f"/api/files/rename/{renameable_file.id}", json="merkle-renamed.txt.exef")
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        assert get_item(renameable_file.id).name == "merkle-renamed.txt.exef"
        assert_dirty(renameable_file.id, item_version)
        assert_dirty(folder_id, folder_version)
        assert_dirty(root_id, root_version)

    def test_rename_multiple_marks_the_chain_dirty(
        self, test_user, auth_client: TestClient, renameable_file: FSItem, mark_clean, assert_dirty
    ):
        root_id = test_user["root_id"]
        folder_id = renameable_file.parent_id

        mark_clean(renameable_file.id)
        item_version = get_item(renameable_file.id).version
        folder_version = get_item(folder_id).version
        root_version = get_item(root_id).version

        response = auth_client.post(
            "/api/files/rename-multiple",
            json={str(renameable_file.id): "merkle-renamed-multiple.txt.exef", str(folder_id): "merkle-renamed-folder"},
        )
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        assert get_item(renameable_file.id).name == "merkle-renamed-multiple.txt.exef"
        assert_dirty(renameable_file.id, item_version)
        assert_dirty(folder_id, folder_version)
        assert_dirty(root_id, root_version)
