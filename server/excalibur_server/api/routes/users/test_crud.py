import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from excalibur_server.api.app import app
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.db.tables import FSItem, User
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
    if get_user_from_id(user.id):
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
