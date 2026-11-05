import json
from base64 import b64decode, b64encode
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.operations import get_item, get_pending_name_items, get_session
from excalibur_server.src.db.tables import FSItem, User

NAMES_USER = "names-user"


# Fixtures
@pytest.fixture(scope="function")
def names_user(db_session: Session):
    from excalibur_server.src.db.operations import get_user

    user = get_user(NAMES_USER)
    if user is None:
        user = User(
            id=UUID("01234567-89ab-dcef-0123-456789dddddd"),
            username=NAMES_USER,
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            keygen_algorithm="Example Keygen Function",
            vault_info="Some Sample Info",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        root_folder = FSItem(parent_id=None, is_folder=True)
        root_folder.root_id = root_folder.id
        user.fsitem_id = root_folder.id

        db_session.add(root_folder)
        db_session.add(user)
        db_session.commit()

    root_id = user.fsitem_id

    # Reset the vault to a known state: a folder with a legacy name that contains a legacy file and a
    # migrated file
    with get_session() as session, session.begin():
        for item in session.execute(select(FSItem).where(FSItem.root_id == root_id)).scalars().all():
            if item.id != root_id:
                session.delete(item)

    folder = FSItem(parent_id=root_id, root_id=root_id, name="a-folder", is_folder=True)
    legacy_file = FSItem(parent_id=folder.id, root_id=root_id, name="a-file.exef", size=1234)
    migrated_file = FSItem(parent_id=folder.id, root_id=root_id, name_enc=b"already", name_tag=b"\x11" * 32, size=1)
    items = {"folder": folder.id, "legacy_file": legacy_file.id, "migrated_file": migrated_file.id}
    with get_session() as session, session.begin():
        session.add_all([folder, legacy_file, migrated_file])

    yield {"user": user, "root_id": root_id, **items}


@pytest.fixture(scope="function")
def names_client(names_user) -> TestClient:
    MASTER_KEYS_CACHE["names-uuid"] = b"one demo 16B key"
    token = generate_auth_token(names_user["user"].id, "names-uuid", datetime.now(tz=UTC).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


# Helper functions
def _load(response) -> list | dict:
    return json.loads(ExEF(b"one demo 16B key").decrypt(response.content))


def _name(seed: int) -> dict[str, str]:
    return {
        "name_enc": b64encode(b"encrypted-" + bytes([seed])).decode(),
        "name_tag": b64encode(bytes([seed]) * 32).decode(),
    }


# Test classes
class TestHasPendingNames:
    def test_no_auth(self):
        assert TestClient(app).head("/api/files/names/pending").status_code == 401

    def test_pending(self, names_client: TestClient):
        assert names_client.head("/api/files/names/pending").status_code == 200

    def test_none_pending(self, names_user, names_client: TestClient):
        for key in ("folder", "legacy_file"):
            response = names_client.post("/api/files/names/fill", json={str(names_user[key]): _name(len(key))})
            assert response.status_code == 200

        assert names_client.head("/api/files/names/pending").status_code == 204

    def test_empty_vault(self, names_user, names_client: TestClient):
        for key in ("folder", "legacy_file", "migrated_file"):
            with get_session() as session, session.begin():
                session.delete(session.get(FSItem, names_user[key]))

        assert names_client.head("/api/files/names/pending").status_code == 204


class TestGetPendingNames:
    def test_no_auth(self):
        assert TestClient(app).get("/api/files/names/pending").status_code == 401

    def test_get(self, names_user, names_client: TestClient):
        response = names_client.get("/api/files/names/pending")
        assert response.status_code == 200

        pending = _load(response)
        assert pending == sorted(
            [
                {
                    "id": str(names_user["folder"]),
                    "parent_id": str(names_user["root_id"]),
                    "is_folder": True,
                    "name": "a-folder",
                },
                {
                    "id": str(names_user["legacy_file"]),
                    "parent_id": str(names_user["folder"]),
                    "is_folder": False,
                    "name": "a-file.exef",
                },
            ],
            key=lambda entry: entry["id"],
        )

    def test_excludes_root_and_migrated(self, names_user, names_client: TestClient):
        ids = {entry["id"] for entry in _load(names_client.get("/api/files/names/pending"))}
        assert str(names_user["root_id"]) not in ids
        assert str(names_user["migrated_file"]) not in ids

    def test_does_not_include_other_users(self, names_user, names_client: TestClient):
        # The shared test user has legacy-named items of its own
        ids = {entry["id"] for entry in _load(names_client.get("/api/files/names/pending"))}
        assert ids == {str(names_user["folder"]), str(names_user["legacy_file"])}

    def test_paging(self, names_client: TestClient):
        all_ids = [entry["id"] for entry in _load(names_client.get("/api/files/names/pending"))]
        assert all_ids == sorted(all_ids)
        assert len(all_ids) == 2

        response = names_client.get("/api/files/names/pending", params={"limit": 1})
        assert [entry["id"] for entry in _load(response)] == all_ids[:1]

        response = names_client.get("/api/files/names/pending", params={"limit": 1, "offset": 1})
        assert [entry["id"] for entry in _load(response)] == all_ids[1:]

        response = names_client.get("/api/files/names/pending", params={"offset": 2})
        assert _load(response) == []

    def test_reject_bad_paging(self, names_client: TestClient):
        assert names_client.get("/api/files/names/pending", params={"limit": 0}).status_code == 422
        assert names_client.get("/api/files/names/pending", params={"offset": -1}).status_code == 422


class TestFillNames:
    def test_no_auth(self):
        response = TestClient(app).post("/api/files/names/fill", json={str(uuid4()): _name(1)})
        assert response.status_code == 401

    def test_fill(self, names_user, names_client: TestClient):
        names = {str(names_user["folder"]): _name(1), str(names_user["legacy_file"]): _name(2)}

        response = names_client.post("/api/files/names/fill", json=names)
        assert response.status_code == 200, ExEF(b"one demo 16B key").decrypt(response.content)

        for item_id, name in names.items():
            item = get_item(UUID(item_id))
            assert item.name is None  # The plaintext name is erased
            assert item.name_enc == b64decode(name["name_enc"])
            assert item.name_tag == b64decode(name["name_tag"])
        assert get_pending_name_items(names_user["root_id"]) == []

    def test_fill_in_chunks_and_resume(self, names_user, names_client: TestClient):
        folder_id, file_id = str(names_user["folder"]), str(names_user["legacy_file"])

        assert names_client.post("/api/files/names/fill", json={folder_id: _name(1)}).status_code == 200
        assert [i.id for i in get_pending_name_items(names_user["root_id"])] == [names_user["legacy_file"]]

        # Re-submitting overwrites what was there
        assert names_client.post("/api/files/names/fill", json={folder_id: _name(3)}).status_code == 200
        assert get_item(names_user["folder"]).name_tag == b64decode(_name(3)["name_tag"])

        assert names_client.post("/api/files/names/fill", json={file_id: _name(2)}).status_code == 200
        assert get_pending_name_items(names_user["root_id"]) == []

    def test_fill_with_encrypted_body(self, names_user, names_client: TestClient):
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        }
        body = {str(names_user["folder"]): _name(1)}
        body_encrypted = ExEF(b"one demo 16B key").encrypt(json.dumps(body).encode("utf-8"))

        response = names_client.post("/api/files/names/fill", headers=headers, content=body_encrypted)
        assert response.status_code == 200
        assert get_item(names_user["folder"]).name is None

    def test_fill_nothing(self, names_client: TestClient):
        assert names_client.post("/api/files/names/fill", json={}).status_code == 200

    def test_marks_chain_dirty(self, names_user, names_client: TestClient, mark_clean, assert_dirty):
        root_id = names_user["root_id"]
        mark_clean(names_user["legacy_file"])
        versions = {key: get_item(names_user[key]).version for key in ("legacy_file", "folder")}
        root_version = get_item(root_id).version

        response = names_client.post("/api/files/names/fill", json={str(names_user["legacy_file"]): _name(2)})
        assert response.status_code == 200

        assert_dirty(names_user["legacy_file"], versions["legacy_file"])
        assert_dirty(names_user["folder"], versions["folder"])
        assert_dirty(root_id, root_version)

    def test_clash_changes_nothing(self, names_user, names_client: TestClient):
        # One tag clashes with an item that is already in the same folder
        clash = {"name_enc": b64encode(b"x").decode(), "name_tag": b64encode(b"\x11" * 32).decode()}
        body = {str(names_user["legacy_file"]): clash, str(names_user["folder"]): _name(1)}

        response = names_client.post("/api/files/names/fill", json=body)
        assert response.status_code == 409

        # The valid entry was not applied either
        assert get_item(names_user["folder"]).name == "a-folder"
        assert get_item(names_user["folder"]).name_tag is None
        assert get_item(names_user["legacy_file"]).name == "a-file.exef"

    def test_duplicate_tags_in_chunk(self, names_user, db_session: Session, names_client: TestClient):
        sibling = FSItem(parent_id=names_user["folder"], root_id=names_user["root_id"], name="sibling.exef")
        db_session.add(sibling)
        db_session.commit()

        body = {str(names_user["legacy_file"]): _name(5), str(sibling.id): _name(5)}
        assert names_client.post("/api/files/names/fill", json=body).status_code == 409
        assert get_item(sibling.id).name == "sibling.exef"
        assert get_item(names_user["legacy_file"]).name == "a-file.exef"

    def test_unknown_item(self, names_user, names_client: TestClient):
        body = {str(names_user["folder"]): _name(1), str(uuid4()): _name(2)}
        assert names_client.post("/api/files/names/fill", json=body).status_code == 409
        assert get_item(names_user["folder"]).name == "a-folder"

    def test_item_of_another_user(self, names_user, names_client: TestClient, test_user, db_session: Session):
        # An item in the shared test user's vault
        foreign = FSItem(parent_id=test_user["root_id"], root_id=test_user["root_id"], name="foreign.exef")
        db_session.add(foreign)
        db_session.commit()

        try:
            response = names_client.post("/api/files/names/fill", json={str(foreign.id): _name(1)})
            assert response.status_code == 409
            assert get_item(foreign.id).name == "foreign.exef"
            assert get_item(foreign.id).name_tag is None
        finally:
            db_session.delete(foreign)
            db_session.commit()

    def test_root_cannot_be_named(self, names_user, names_client: TestClient):
        response = names_client.post("/api/files/names/fill", json={str(names_user["root_id"]): _name(1)})
        assert response.status_code == 409
        assert get_item(names_user["root_id"]).name_enc is None

    def test_invalid_names(self, names_user, names_client: TestClient):
        item_id = str(names_user["folder"])
        valid = _name(1)

        assert names_client.post("/api/files/names/fill", json={item_id: "name"}).status_code == 422
        assert (
            names_client.post("/api/files/names/fill", json={item_id: {**valid, "name_tag": "AAAA"}}).status_code == 422
        )
        assert names_client.post("/api/files/names/fill", json={item_id: {**valid, "name_enc": ""}}).status_code == 422

        too_big = b64encode(b"x" * (CONFIG.storage.database.max_encrypted_name_size + 1)).decode()
        assert (
            names_client.post("/api/files/names/fill", json={item_id: {**valid, "name_enc": too_big}}).status_code
            == 422
        )
        assert get_item(names_user["folder"]).name == "a-folder"
