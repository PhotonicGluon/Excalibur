import json
from base64 import b64decode, b64encode
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_item_by_name_tag
from excalibur_server.src.db.tables import FSItem


def _new_dir(parent_id: UUID, name: str, encrypted_name, item_id: UUID | None = None) -> dict:
    return {"id": str(item_id or uuid4()), **encrypted_name(parent_id, name)}


class TestCreateDir:
    def test_no_auth(self):
        response = TestClient(app).post(
            f"/api/files/mkdir/{uuid4()}",
            json={
                "id": str(uuid4()),
                "name_enc": b64encode(b"a").decode(),
                "name_tag": b64encode(b"\x01" * 32).decode(),
            },
        )
        assert response.status_code == 401

    def test_create_directory_no_transit_encryption(self, auth_client: TestClient, test_user, encrypted_name):
        root_id = test_user["root_id"]

        body = _new_dir(root_id, f"test-dir-{uuid4().hex}", encrypted_name)
        response = auth_client.post(f"/api/files/mkdir/{root_id}", json=body)
        assert response.status_code == 201

        # The server used the client's ID and stored the fields as given
        folder = get_item(UUID(body["id"]))
        assert folder.is_folder
        assert folder.parent_id == root_id
        assert folder.root_id == root_id
        assert folder.name is None
        assert folder.name_enc == b64decode(body["name_enc"])
        assert folder.name_tag == b64decode(body["name_tag"])

    def test_create_directory_transit_encryption(self, auth_client: TestClient, test_user, encrypted_name):
        root_id = test_user["root_id"]

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        body = _new_dir(root_id, f"test-dir-{uuid4().hex}", encrypted_name)

        path_encrypted_data = ExEF(b"one demo 16B key").encrypt(b".")
        transit_encrypted_data = ExEF(b"one demo 16B key").encrypt(json.dumps(body).encode())
        response = auth_client.post(
            f"/api/files/mkdir/{b64encode(path_encrypted_data, altchars=b'-_').decode('UTF-8')}",
            headers=headers,
            content=transit_encrypted_data,
        )

        assert response.status_code == 201
        assert get_item(UUID(body["id"])) is not None

    def test_create_in_subdirectory(self, auth_client: TestClient, test_user, db_session: Session, encrypted_name):
        root_id = test_user["root_id"]

        parent = FSItem(parent_id=root_id, root_id=root_id, name=f"parent-{uuid4().hex}", is_folder=True)
        db_session.add(parent)
        db_session.commit()

        body = _new_dir(parent.id, "child", encrypted_name)
        response = auth_client.post(f"/api/files/mkdir/{parent.id}", json=body)
        assert response.status_code == 201
        assert get_item_by_name_tag(parent.id, b64decode(body["name_tag"])).id == UUID(body["id"])

    def test_same_name_in_different_folders(self, auth_client: TestClient, test_user, db_session: Session, name_fields):
        # The tag is derived from the parent, so the same name can be used in two folders
        root_id = test_user["root_id"]
        parent = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, "other-parent"))
        db_session.add(parent)
        db_session.commit()

        tag = b64encode(b"\x42" * 32).decode()
        for parent_id in (root_id, parent.id):
            body = {"id": str(uuid4()), "name_enc": b64encode(b"x").decode(), "name_tag": tag}
            assert auth_client.post(f"/api/files/mkdir/{parent_id}", json=body).status_code == 201

    def test_parent_not_found(self, auth_client: TestClient, encrypted_name):
        parent_id = uuid4()
        response = auth_client.post(
            f"/api/files/mkdir/{parent_id}", json=_new_dir(parent_id, "test-dir", encrypted_name)
        )
        assert response.status_code == 404

    def test_parent_is_not_a_directory(
        self, auth_client: TestClient, test_user, db_session: Session, name_fields, encrypted_name
    ):
        root_id = test_user["root_id"]
        file = FSItem(parent_id=root_id, root_id=root_id, size=0, **name_fields(root_id, f"file-{uuid4().hex}"))
        db_session.add(file)
        db_session.commit()

        response = auth_client.post(f"/api/files/mkdir/{file.id}", json=_new_dir(file.id, "test-dir", encrypted_name))
        assert response.status_code == 404

    def test_parent_of_another_user(self, auth_client: TestClient, db_session: Session, encrypted_name):
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        db_session.add(other_root)
        db_session.commit()

        try:
            body = _new_dir(other_root.id, "test-dir", encrypted_name)
            response = auth_client.post(f"/api/files/mkdir/{other_root.id}", json=body)
            assert response.status_code == 404
            assert get_item(UUID(body["id"])) is None
        finally:
            db_session.delete(other_root)
            db_session.commit()

    def test_name_already_exists(
        self, auth_client: TestClient, test_user, db_session: Session, name_fields, encrypted_name
    ):
        root_id = test_user["root_id"]
        name = f"test-dir-{uuid4().hex}"

        # Create a pre-existing folder
        existing = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, name))
        db_session.add(existing)
        db_session.commit()

        # Then send the folder creation request, with a fresh ID but the same tag
        body = _new_dir(root_id, name, encrypted_name)
        response = auth_client.post(f"/api/files/mkdir/{root_id}", json=body)
        assert response.status_code == 409
        assert get_item(UUID(body["id"])) is None

    def test_id_already_exists(
        self, auth_client: TestClient, test_user, db_session: Session, name_fields, encrypted_name
    ):
        root_id = test_user["root_id"]

        existing = FSItem(parent_id=root_id, root_id=root_id, is_folder=True, **name_fields(root_id, uuid4().hex))
        db_session.add(existing)
        db_session.commit()

        # Same ID, different name
        body = _new_dir(root_id, f"test-dir-{uuid4().hex}", encrypted_name, item_id=existing.id)
        response = auth_client.post(f"/api/files/mkdir/{root_id}", json=body)
        assert response.status_code == 409
        assert get_item_by_name_tag(root_id, b64decode(body["name_tag"])) is None

    def test_invalid_name_fields(self, auth_client: TestClient, test_user):
        root_id = test_user["root_id"]
        valid = {"id": str(uuid4()), "name_enc": b64encode(b"a").decode(), "name_tag": b64encode(b"\x01" * 32).decode()}

        short_tag = {**valid, "name_tag": b64encode(b"\x01" * 31).decode()}
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json=short_tag).status_code == 422

        empty_enc = {**valid, "name_enc": ""}
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json=empty_enc).status_code == 422

        bad_id = {**valid, "id": "not-a-uuid"}
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json=bad_id).status_code == 422

        # A bare string is no longer a valid body
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json="plain-name").status_code == 422

    def test_name_enc_size_cap(self, auth_client: TestClient, test_user):
        root_id = test_user["root_id"]
        tag = b64encode(b"\x01" * 32).decode()

        at_cap = {
            "id": str(uuid4()),
            "name_enc": b64encode(b"x" * CONFIG.storage.database.max_encrypted_name_size).decode(),
            "name_tag": tag,
        }
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json=at_cap).status_code == 201

        over_cap = {
            "id": str(uuid4()),
            "name_enc": b64encode(b"x" * (CONFIG.storage.database.max_encrypted_name_size + 1)).decode(),
            "name_tag": b64encode(b"\x02" * 32).decode(),
        }
        assert auth_client.post(f"/api/files/mkdir/{root_id}", json=over_cap).status_code == 422


class TestCreateDirMerkleEffects:
    def test_mkdir_returns_new_folder_id(self, auth_client: TestClient, test_user, encrypted_name):
        root_id = test_user["root_id"]

        body = _new_dir(root_id, f"merkle-dir-{uuid4().hex}", encrypted_name)
        response = auth_client.post(f"/api/files/mkdir/{root_id}", json=body)
        assert response.status_code == 201

    def test_mkdir_marks_ancestors_dirty(
        self, auth_client: TestClient, test_user, mark_clean, assert_dirty, encrypted_name
    ):
        root_id = test_user["root_id"]

        mark_clean(root_id)
        root_version = get_item(root_id).version

        body = _new_dir(root_id, f"merkle-dir-{uuid4().hex}", encrypted_name)
        response = auth_client.post(f"/api/files/mkdir/{root_id}", json=body)
        assert response.status_code == 201

        new_folder = get_item(UUID(body["id"]))
        assert new_folder.node_hash is None
        assert_dirty(root_id, root_version)
