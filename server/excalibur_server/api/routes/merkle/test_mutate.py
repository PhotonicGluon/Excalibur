from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.db.tables import Attestation, FSItem, User

MUTATION_USER = "mutation-user"


@pytest.fixture(scope="session")
def mutation_user(db_session: Session):
    # Check if user already exists
    from excalibur_server.src.db.operations import get_user

    if existing_user := get_user(MUTATION_USER):
        return {"user": existing_user, "root_id": existing_user.fsitem_id}

    # Create user
    user = User(
        id=UUID("01234567-89ab-dcef-0123-456789ffffff"),
        username=MUTATION_USER,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        keygen_algorithm="Example Keygen Function",
        vault_info="Some Sample Info",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    root_folder = FSItem(name=str(user.id), parent_id=None, is_folder=True)
    root_folder.root_id = root_folder.id
    user.fsitem_id = root_folder.id

    root_attestation = Attestation(
        root_id=root_folder.id,
        generation=1,
        root_hash=b"test_root_hash",
        prev_root_hash=None,
        timestamp=1,
        tag=b"demo-tag",
    )

    db_session.add(root_folder)
    db_session.add(user)
    db_session.add(root_attestation)
    db_session.commit()

    return {"user": user, "root_id": root_folder.id}


@pytest.fixture(scope="class")
def mutation_client(mutation_user) -> TestClient:
    """
    An authenticated client for testing.
    """

    MASTER_KEYS_CACHE["mutation-uuid"] = b"one demo 16B key"
    token = generate_auth_token(str(mutation_user["user"].id), "mutation-uuid", datetime.now(tz=UTC).timestamp() + 9999)
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client
