import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.db.tables import FSItem, User
from excalibur_server.src.exef import ExEF
from excalibur_server.src.users import get_user, get_user_from_id

client = TestClient(app)


def _create_temp_user(db_session: Session, username: str):
    user = User(
        username=username,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        additional_info=f"Some Sample Info for {username}",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    root_folder = FSItem(name=str(user.id), parent_id=None, is_folder=True)
    root_folder.root_id = root_folder.id
    user.fsitem_id = root_folder.id
    db_session.add(root_folder)
    db_session.add(user)
    db_session.commit()

    yield user

    # Clean up
    if get_user_from_id(user.id) is not None:
        db_session.delete(user)
        db_session.delete(root_folder)
        db_session.commit()


class TestCheckUser:
    @pytest.fixture
    def temp_user(self, db_session: Session):
        yield from _create_temp_user(db_session, "temp-check-user")

    def test_check_user(self, temp_user: User):
        response = client.head(f"/api/users/check/{temp_user.username}")
        assert response.status_code == 200

    def test_non_existent_user(self):
        response = client.head("/api/users/check/does-not-exist")
        assert response.status_code == 404


class TestRenameUser:
    def test_no_auth(self):
        response = client.put("/api/users/edit/username", json="test-user-renamed")
        assert response.status_code == 401

    def test_rename_user(self, auth_client: TestClient, db_session: Session):
        # Create test user
        temp_user = User(
            username="temp-rename-user",
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            additional_info="Some Sample Info for temp-rename-user",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        db_session.add(temp_user)
        db_session.commit()

        # Send rename request
        MASTER_KEYS_CACHE[str(temp_user.id)] = b"one demo 16B key"
        token = generate_auth_token(str(temp_user.id), str(temp_user.id), 9_999_999_999)
        with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as auth_client:
            response = auth_client.put(
                "/api/users/edit/username",
                json="temp-rename-user-renamed",
            )
            assert response.status_code == 200

        assert get_user("temp-rename-user") is None
        assert get_user("temp-rename-user-renamed") is not None

    def test_rename_user_with_encrypted(self, auth_client: TestClient, db_session: Session):
        # Create test user
        temp_user = User(
            username="temp-rename-user-enc",
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            additional_info="Some Sample Info for temp-rename-user-enc",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        db_session.add(temp_user)
        db_session.commit()

        # Prepare request
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "text/plain",
        }
        new_username_encrypted = ExEF(b"one demo 16B key").encrypt(b"temp-rename-user-enc-renamed")

        # Send rename request
        MASTER_KEYS_CACHE[str(temp_user.id)] = b"one demo 16B key"
        token = generate_auth_token(str(temp_user.id), str(temp_user.id), 9_999_999_999)
        with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as auth_client:
            response = auth_client.put(
                "/api/users/edit/username",
                headers=headers,
                content=new_username_encrypted,
            )
            assert response.status_code == 200

        assert get_user("temp-rename-user-enc") is None
        assert get_user("temp-rename-user-enc-renamed") is not None

    def test_already_exists(self, auth_client: TestClient, db_session: Session):
        # Create test users
        temp_user_1 = User(
            username="temp-rename-user-1",
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            additional_info="Some Sample Info for temp-rename-user-1",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        temp_user_2 = User(
            username="temp-rename-user-2",
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            additional_info="Some Sample Info for temp-rename-user-2",
            auk_salt=b"test_auk_salt_16_bytes",
            key_enc=b"test_encrypted_vault_key",
        )
        db_session.add(temp_user_1)
        db_session.add(temp_user_2)
        db_session.commit()

        # Trying to rename user to existing username should fail
        MASTER_KEYS_CACHE[str(temp_user_1.id)] = b"one demo 16B key"
        token = generate_auth_token(str(temp_user_1.id), str(temp_user_1.id), 9_999_999_999)
        with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as auth_client:
            response = auth_client.put(
                "/api/users/edit/username",
                json=temp_user_2.username,
            )
            assert response.status_code == 409


class TestRemoveUser:
    @pytest.fixture
    def temp_user(self, db_session: Session):
        yield from _create_temp_user(db_session, "temp-remove-user")

    def test_remove_user(self, temp_user: User):
        response = client.delete(f"/api/users/remove/{temp_user.username}")
        assert response.status_code == 200
        assert get_user(temp_user.username) is None

    def test_non_existent_user(self):
        response = client.delete("/api/users/remove/does-not-exist")
        assert response.status_code == 404
