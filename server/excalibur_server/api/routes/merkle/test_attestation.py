import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from excalibur_server.api.app import app
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.db.tables import Attestation

N_ATTESTATIONS = 10


@pytest.fixture
def attestations(test_user, db_session: Session) -> list[Attestation]:
    root_id = test_user["root_id"]

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
        db_session.delete(db_session.get(Attestation, (attestation.root_id, attestation.generation)))
    db_session.commit()


class TestGetLatestAttestation:
    def test_no_auth(self):
        response = TestClient(app).get("/api/merkle/attestation")
        assert response.status_code == 401

    def test_get(self, auth_client: TestClient, attestations: list[Attestation]):
        response = auth_client.get("/api/merkle/attestation")
        assert response.status_code == 200

        latest_attestation = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        expected_latest_attestation = attestations[-1].model_dump()
        assert latest_attestation == expected_latest_attestation

    def test_get_no_attestations(self, auth_client: TestClient):
        response = auth_client.get("/api/merkle/attestation")
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
        self, auth_client: TestClient, attestations: list[Attestation], from_gen: int | None, to_gen: int | None
    ):
        params = {}
        if from_gen is not None:
            params["from_gen"] = from_gen
        if to_gen is not None:
            params["to_gen"] = to_gen
        response = auth_client.get("/api/merkle/attestations", params=params)
        assert response.status_code == 200

        attestations_list = json.loads(ExEF(b"one demo 16B key").decrypt(response.content))
        expected_attestations = []
        for att in attestations:
            if from_gen is not None and att.generation < from_gen:
                continue
            if to_gen is not None and att.generation > to_gen:
                continue
            expected_attestations.append(att.model_dump())

        assert len(attestations_list) == len(expected_attestations)
        for att in attestations_list:
            assert att in expected_attestations
