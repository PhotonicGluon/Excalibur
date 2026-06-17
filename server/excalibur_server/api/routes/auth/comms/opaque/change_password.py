from typing import Annotated

from fastapi import Depends, WebSocket, WebSocketDisconnect

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials_ws
from excalibur_server.src.auth.opaque import OPAQUE
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer
from excalibur_server.src.auth.opaque.ristretto255 import Ristretto255
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_session
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import get_user_from_id
from excalibur_server.src.websocket import EncryptedWebSocketManager, WebSocketMsg


@router.websocket("/opaque/change-password")
async def change_password_endpoint(
    websocket: WebSocket,
    credentials: Annotated[Credentials, Depends(get_credentials_ws)],
):
    """
    Endpoint that handles the changing of existing users' passwords.

    All messages should be encrypted with the current session key of the user.
    """

    OPAQUE = _get_opaque()

    key = MASTER_KEYS_CACHE[credentials.comm_uuid]
    ws_manager = EncryptedWebSocketManager(websocket, key)

    await ws_manager.accept()
    try:
        # Wait for registration request
        registration_request_raw = (await ws_manager.receive()).data

        # Get associated user
        user = get_user_from_id(credentials.user_id)

        # Generate registration response
        registration_request = OPAQUE.deserialize_registration_request(registration_request_raw)
        registration_response = OPAQUE.create_registration_response(
            request=registration_request,
            server_public_key=_get_public_key(),
            credential_identifier=_get_credential_identifier(user.username),
            oprf_seed=_get_oprf_seed(),
        )
        await ws_manager.send(WebSocketMsg(registration_response.serialize()))

        # Wait for client to send registration record
        registration_record_raw = (await ws_manager.receive()).data

        # Amend user's password
        with get_session() as session:
            with session.begin():
                user = session.query(User).filter_by(username=user.username).first()
                user.registration_record = registration_record_raw

        # Send confirmation
        await ws_manager.send(WebSocketMsg(status="OK"))

        # Finally, close connection
        await ws_manager.close()
    except WebSocketDisconnect:
        pass


# Monkeypatch Functions
def _get_opaque() -> OPAQUEServer:
    """
    Get the OPAQUE server instance.

    The extraction of the OPAQUE server instance from the module is done this way so that we can monkeypatch
    it in tests.

    :return: the OPAQUE server instance
    """

    return OPAQUE


def _get_oprf_seed() -> bytes:
    """
    Get the OPRF seed.

    The extraction of the OPRF seed is done this way so that we can monkeypatch it in tests.

    :return: the OPRF seed
    """

    return CONFIG.security.opaque.oprf_seed


def _get_public_key() -> Ristretto255:
    """
    Get the server public key.

    The extraction of the server public key is done this way so that we can monkeypatch it in tests.

    :return: the server public key
    """

    return CONFIG.security.opaque.public_key


def _get_credential_identifier(username: str) -> bytes:
    """
    Get the credential identifier.

    The extraction of the credential identifier is done this way so that we can monkeypatch it in tests.

    :param username: the username
    :return: the credential identifier
    """

    return username.encode()
