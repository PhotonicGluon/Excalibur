import json
from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.tables import Attestation, FSItem, User

ATTESTATION_USER = "attestation-user"
N_ATTESTATIONS = 10


@pytest.fixture(scope="session")
def attestation_user(db_session: Session):
    # Check if user already exists
    from excalibur_server.src.db.operations import get_user

    if existing_user := get_user(ATTESTATION_USER):
        return {"user": existing_user, "root_id": existing_user.fsitem_id}

    # Create user
    user = User(
        id=UUID("01234567-ffff-ffff-0123-456789abcdef"),
        username=ATTESTATION_USER,
        auth_protocol=AuthProtocol.OPAQUE_3DH,
        keygen_algorithm="Example Keygen Function",
        vault_info="Some Sample Info",
        auk_salt=b"test_auk_salt_16_bytes",
        key_enc=b"test_encrypted_vault_key",
    )
    root_folder = FSItem(name=str(user.id), parent_id=None, is_folder=True)
    root_folder.root_id = root_folder.id
    user.fsitem_id = root_folder.id

    db_session.add(root_folder)
    db_session.add(user)
    db_session.commit()

    return {"user": user, "root_id": root_folder.id}


@pytest.fixture(scope="class")
def attestation_client(attestation_user) -> TestClient:
    """
    An authenticated client for testing.
    """

    MASTER_KEYS_CACHE["attestation-uuid"] = b"one demo 16B key"
    token = generate_auth_token(
        str(attestation_user["user"].id), "attestation-uuid", datetime.now(tz=UTC).timestamp() + 9999
    )
    with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
        yield client


@pytest.fixture
def attestations(attestation_user, db_session: Session) -> list[Attestation]:
    root_id = attestation_user["root_id"]

    # Create attestation chain
    generated_attestations = []
    current_root_hash = None

    for gen in range(1, N_ATTESTATIONS + 1):
        attestation = Attestation(
            root_id=root_id,
            generation=gen,
            root_hash=f"root_hash_{gen}".encode(),
            prev_root_hash=current_root_hash,
            timestamp=gen,
            tag=f"tag_{gen}".encode(),
        )
        generated_attestations.append(attestation.model_copy())
        current_root_hash = attestation.root_hash
        db_session.add(attestation)

    # Commit and yield
    db_session.commit()
    yield generated_attestations

    # Clean up
    for attestation in generated_attestations:
        # The composite key is given as a mapping so that it does not depend on column ordering
        db_session.delete(
            db_session.get(Attestation, {"root_id": attestation.root_id, "generation": attestation.generation})
        )
    db_session.commit()


class TestGetLatestAttestation:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/attestation")
        assert response.status_code == 401

    def test_get(self, attestation_client: TestClient, attestations: list[Attestation]):
        response = attestation_client.get("/api/merkle/attestation")
        assert response.status_code == 200

        latest_attestation = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        expected_latest_attestation = attestations[-1].model_dump(mode="json")
        assert latest_attestation == expected_latest_attestation

    def test_get_no_attestations(self, attestation_client: TestClient):
        response = attestation_client.get("/api/merkle/attestation")
        assert response.status_code == 200

        latest_attestation = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        assert latest_attestation is None


class TestGetAttestationChain:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/attestations")
        assert response.status_code == 401

    @pytest.mark.parametrize(
        "from_gen,to_gen",
        [
            (None, None),
            (3, None),
            (None, 7),
            (3, 7),
            (None, 0),
            (N_ATTESTATIONS, None),
            (N_ATTESTATIONS, N_ATTESTATIONS - 1),
        ],
    )
    def test_get(
        self, attestation_client: TestClient, attestations: list[Attestation], from_gen: int | None, to_gen: int | None
    ):
        params = {}
        if from_gen is not None:
            params["from_gen"] = from_gen
        if to_gen is not None:
            params["to_gen"] = to_gen
        response = attestation_client.get("/api/merkle/attestations", params=params)
        assert response.status_code == 200

        attestations_list = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        expected_attestations = []
        for att in attestations:
            if from_gen is not None and att.generation < from_gen:
                continue
            if to_gen is not None and att.generation > to_gen:
                continue
            expected_attestations.append(att.model_dump(mode="json"))

        assert len(attestations_list) == len(expected_attestations)
        for att in attestations_list:
            assert att in expected_attestations
