import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlmodel import Session, SQLModel

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.tables import FSItem, User


@pytest.fixture(scope="session", autouse=True)
def disable_proof_checks():
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "0"
    yield
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "1"


@pytest.fixture(scope="session", autouse=True)
def test_database():
    # Use a test database file
    ROOT_FOLDER.mkdir(parents=True, exist_ok=True)
    CONFIG.storage.database.file = Path("test.duckdb")
    db_path = ROOT_FOLDER / CONFIG.storage.database.file

    if db_path.exists():
        db_path.unlink()

    # Create all tables in the test database
    engine = create_engine(f"duckdb:///{db_path}")
    SQLModel.metadata.create_all(engine)

    try:
        yield engine
    finally:
        engine.dispose()
        try:
            if db_path.exists():
                db_path.unlink()
        except PermissionError:
            # File might be locked, that's okay for tests
            pass


@pytest.fixture(scope="session")
def db_session(test_database: Engine):
    with Session(test_database) as session:
        yield session


@pytest.fixture(scope="session")
def test_user(db_session: Session):
    # Check if user already exists
    from excalibur_server.src.db.operations import get_user

    if existing_user := get_user("test-user-db"):
        return {"user": existing_user, "root_id": existing_user.fsitem_id}

    # Create legacy test user (i.e., using traditional file system) for existing tests
    legacy_test_user = User(
        username="test-user",
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        fsitem_id=None,  # No database filesystem for legacy user
        additional_info="Some Sample Info",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    db_session.add(legacy_test_user)

    # Create root folder for user
    root_id = uuid.uuid4()
    root_folder = FSItem(id=root_id, parent_id=None, root_id=root_id, name="test-user-db", is_folder=True)
    db_session.add(root_folder)

    # Create test user with database filesystem
    db_test_user = User(
        username="test-user-db",
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        fsitem_id=root_id,
        additional_info="Some Sample Info",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    db_session.add(db_test_user)

    # Commit all items
    db_session.commit()

    return {"user": db_test_user, "root_id": root_id}


@pytest.fixture(scope="class")
def auth_client(test_user) -> TestClient:
    """
    An authenticated client for testing.
    """

    MASTER_KEYS_CACHE["some-uuid"] = b"one demo 16B key"
    token = generate_auth_token("test-user", "some-uuid", datetime.now(tz=timezone.utc).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


@pytest.fixture(scope="class")
def auth_client_db(test_user) -> TestClient:
    """
    An authenticated client for testing with database filesystem.
    """

    MASTER_KEYS_CACHE["some-uuid"] = b"one demo 16B key"
    token = generate_auth_token("test-user-db", "some-uuid", datetime.now(tz=timezone.utc).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client
