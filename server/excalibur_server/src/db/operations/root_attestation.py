from uuid import UUID

from sqlalchemy import select

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import RootAttestation


def get_latest_attestation(root_id: UUID) -> RootAttestation | None:
    """
    Gets the latest attestation for a root ID.

    :param root_id: the root ID to check
    :return: the latest attestation, or None if there is no attestation
    """

    with get_session() as session:
        latest = (
            session.execute(
                select(RootAttestation)
                .where(RootAttestation.root_id == root_id)
                .order_by(RootAttestation.generation.desc())
            )
            .scalars()
            .first()
        ).model_copy()

    return latest
