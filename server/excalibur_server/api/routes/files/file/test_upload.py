from base64 import b64encode, urlsafe_b64encode
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_item_by_name_tag
from excalibur_server.src.db.tables import FSItem


# Helper functions
def _details(parent_id: UUID, name: str, item_id: UUID | None = None) -> tuple[UUID, bytes, str]:
    """
    Builds the `item_details` path parameter for a file, returning the ID, the tag, and the parameter.
    """

    item_id = item_id or uuid4()
    fields = {"name_enc": b"enc-" + name.encode(), "name_tag": _tag(parent_id, name)}
    details = (
        f"{item_id}:{urlsafe_b64encode(fields['name_enc']).decode()}:{urlsafe_b64encode(fields['name_tag']).decode()}"
    )
    return item_id, fields["name_tag"], details


def _tag(parent_id: UUID, name: str) -> bytes:
    from hashlib import sha256

    return sha256(parent_id.bytes + name.encode()).digest()


def _wrap(value: str) -> str:
    return b64encode(ExEF(b"one demo 16B key").encrypt(value.encode()), altchars=b"-_").decode()


# Test class
class TestUpload:
    def test_no_auth(self):
        _, _, details = _details(uuid4(), "fake")
        response = TestClient(app).post(f"/api/files/upload/{uuid4()}/{details}", content=b"Fake content")
        assert response.status_code == 401

    def test_upload(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        content = b"No transit encryption content"

        item_id, tag, details = _details(root_id, f"test-{uuid4().hex}")
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=content)
        assert response.status_code == 201

        # The server used the client's ID and stored the fields as given
        item = get_item(item_id)
        assert item is not None
        assert item.parent_id == root_id
        assert item.root_id == root_id
        assert not item.is_folder
        assert item.name is None
        assert item.name_tag == tag
        assert item.name_enc.startswith(b"enc-")
        assert item.size == len(content)

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_upload_to_subdirectory(self, test_user, auth_client: TestClient, db_session: Session):
        root_id = test_user["root_id"]

        folder = FSItem(parent_id=root_id, root_id=root_id, name=f"upload-dir-{uuid4().hex}", is_folder=True)
        db_session.add(folder)
        db_session.commit()

        item_id, tag, details = _details(folder.id, "test.txt")
        response = auth_client.post(f"/api/files/upload/{folder.id}/{details}", content=b"content")
        assert response.status_code == 201
        assert get_item_by_name_tag(folder.id, tag).id == item_id
        assert get_item_by_name_tag(root_id, tag) is None

    def test_upload_transit_encryption(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        content = b"Transit encryption content"

        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }

        item_id, _, details = _details(root_id, f"test-{uuid4().hex}")
        response = auth_client.post(
            f"/api/files/upload/{_wrap('.')}/{_wrap(details)}",
            headers=headers,
            content=ExEF(b"one demo 16B key").encrypt(content),
        )
        assert response.status_code == 201

        item = get_item(item_id)
        assert item is not None

        uploaded_file = CONFIG.storage.vault_folder / item.system_path
        assert uploaded_file.exists()
        assert uploaded_file.read_bytes() == content

    def test_name_already_exists(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        name = f"test-{uuid4().hex}"

        # Initial upload should be OK
        first_id, tag, details = _details(root_id, name)
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"first")
        assert response.status_code == 201

        first = get_item(first_id)
        uploaded_file = CONFIG.storage.vault_folder / first.system_path
        assert uploaded_file.read_bytes() == b"first"

        # Trying again without `force` should fail, and not create the new item
        second_id, _, details = _details(root_id, name)
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"second")
        assert response.status_code == 409
        assert get_item(second_id) is None
        assert uploaded_file.read_bytes() == b"first"

        # Trying again with `force` should succeed, replacing the old item with the new one
        third_id, _, details = _details(root_id, name)
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}?force=true", content=b"third")
        assert response.status_code == 201
        assert get_item(first_id) is None
        assert not uploaded_file.exists()

        assert get_item_by_name_tag(root_id, tag).id == third_id
        assert (CONFIG.storage.vault_folder / get_item(third_id).system_path).read_bytes() == b"third"

    def test_id_already_exists(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        first_id, _, details = _details(root_id, f"test-{uuid4().hex}")
        assert auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"first").status_code == 201

        # Reusing the ID under a different name is rejected, with or without `force`
        _, other_tag, details = _details(root_id, f"other-{uuid4().hex}", item_id=first_id)
        for query in ("", "?force=true"):
            response = auth_client.post(f"/api/files/upload/{root_id}/{details}{query}", content=b"second")
            assert response.status_code == 409
        assert get_item_by_name_tag(root_id, other_tag) is None
        assert (CONFIG.storage.vault_folder / get_item(first_id).system_path).read_bytes() == b"first"

    def test_parent_not_found(self, auth_client: TestClient):
        parent_id = uuid4()
        item_id, _, details = _details(parent_id, "test.txt")
        response = auth_client.post(f"/api/files/upload/{parent_id}/{details}", content=b"fake parent test content")
        assert response.status_code == 404
        assert get_item(item_id) is None

    def test_parent_is_not_a_directory(self, test_user, auth_client: TestClient, db_session: Session):
        root_id = test_user["root_id"]
        file = FSItem(parent_id=root_id, root_id=root_id, size=0, name_enc=b"f", name_tag=_tag(root_id, uuid4().hex))
        db_session.add(file)
        db_session.commit()

        _, _, details = _details(file.id, "test.txt")
        response = auth_client.post(f"/api/files/upload/{file.id}/{details}", content=b"content")
        assert response.status_code == 404

    def test_parent_of_another_user(self, auth_client: TestClient, db_session: Session):
        other_root = FSItem(parent_id=None, root_id=uuid4(), is_folder=True)
        db_session.add(other_root)
        db_session.commit()

        try:
            item_id, _, details = _details(other_root.id, "test.txt")
            response = auth_client.post(f"/api/files/upload/{other_root.id}/{details}", content=b"content")
            assert response.status_code == 404
            assert get_item(item_id) is None
        finally:
            db_session.delete(other_root)
            db_session.commit()

    def test_malformed_item_details(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        tag = urlsafe_b64encode(b"\x01" * 32).decode()
        enc = urlsafe_b64encode(b"enc").decode()

        for details in (
            "just-a-name.exef",
            f"{uuid4()}:{enc}",  # Too few parts
            f"{uuid4()}:{enc}:{tag}:extra",  # Too many parts
            f"not-a-uuid:{enc}:{tag}",
            f"{uuid4()}:{enc}:{urlsafe_b64encode(b'short').decode()}",  # Tag is not 32 bytes
            f"{uuid4()}:!!!:{tag}",  # Not Base64
            f"{uuid4()}::{tag}",  # Empty encrypted name
        ):
            response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"content")
            assert response.status_code == 400, details

    def test_name_enc_size_cap(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]
        cap = CONFIG.storage.database.max_encrypted_name_size
        tag = urlsafe_b64encode(b"\x05" * 32).decode()

        at_cap = f"{uuid4()}:{urlsafe_b64encode(b'x' * cap).decode()}:{tag}"
        assert auth_client.post(f"/api/files/upload/{root_id}/{at_cap}", content=b"c").status_code == 201

        over_tag = urlsafe_b64encode(b"\x06" * 32).decode()
        over_cap = f"{uuid4()}:{urlsafe_b64encode(b'x' * (cap + 1)).decode()}:{over_tag}"
        assert auth_client.post(f"/api/files/upload/{root_id}/{over_cap}", content=b"c").status_code == 400


class TestUploadMerkleEffects:
    def test_upload_returns_new_file_id(self, test_user, auth_client: TestClient):
        root_id = test_user["root_id"]

        item_id, _, details = _details(root_id, f"merkle-{uuid4().hex}")
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"content")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id == str(item_id)

    def test_upload_marks_ancestors_dirty(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]

        mark_clean(root_id)
        root_version = get_item(root_id).version

        item_id, _, details = _details(root_id, f"merkle-{uuid4().hex}")
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"content")
        assert response.status_code == 201

        # The new file starts out dirty, and its parent chain is dirtied along with it
        new_file = get_item(item_id)
        assert new_file.node_hash is None
        assert new_file.content_mac is None
        assert_dirty(root_id, root_version)

    def test_forced_upload_dirties_ancestors(self, test_user, auth_client: TestClient, mark_clean, assert_dirty):
        root_id = test_user["root_id"]
        name = f"merkle-{uuid4().hex}"

        original_id, _, details = _details(root_id, name)
        auth_client.post(f"/api/files/upload/{root_id}/{details}", content=b"first")

        mark_clean(original_id)
        root_version = get_item(root_id).version

        # Overwriting removes the old row, and the new one uses the ID the client chose
        new_id, _, details = _details(root_id, name)
        response = auth_client.post(f"/api/files/upload/{root_id}/{details}?force=true", content=b"second")
        assert response.status_code == 201

        returned_id = ExEF(b"one demo 16B key").decrypt(response.content).decode()
        assert returned_id == str(new_id)
        assert get_item(original_id) is None
        assert_dirty(root_id, root_version)
