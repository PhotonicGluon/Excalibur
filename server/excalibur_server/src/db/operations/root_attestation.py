from uuid import UUID

from sqlalchemy import select

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import RootAttestation


def get_attestations(root_id: UUID, *, from_gen: int | None = None, to_gen: int | None = None) -> list[RootAttestation]:
    """
    Gets the attestations for a root ID within a generation range.

    :param root_id: the root ID to check
    :param from_gen: the starting generation (inclusive), or None to not filter by start
    :param to_gen: the ending generation (inclusive), or None to not filter by end
    :return: the attestations, or an empty list if there are no attestations
    """

    statement = select(RootAttestation).where(RootAttestation.root_id == root_id)
    if from_gen is not None:
        statement = statement.where(RootAttestation.generation >= from_gen)
    if to_gen is not None:
        statement = statement.where(RootAttestation.generation <= to_gen)

    statement = statement.order_by(RootAttestation.generation.desc())

    with get_session() as session:
        attestations = session.execute(statement).scalars().all()
        attestations = [attestation.model_copy() for attestation in attestations]

    return attestations


def get_latest_attestation(root_id: UUID) -> RootAttestation | None:
    """
    Gets the latest attestation for a root ID.

    :param root_id: the root ID to check
    :return: the latest attestation, or None if there is no attestation
    """

    attestations = get_attestations(root_id)
    if len(attestations) == 0:
        return None

    return attestations[0]
