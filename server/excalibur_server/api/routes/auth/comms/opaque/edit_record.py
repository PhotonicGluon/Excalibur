from typing import Annotated

from fastapi import Depends, WebSocket, WebSocketDisconnect

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.credentials import Credentials, get_credentials_ws
from excalibur_server.src.auth.opaque import OPAQUE
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.ristretto255 import Ristretto255
from excalibur_server.src.db.operations import get_session
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import get_user, get_user_from_id
from excalibur_server.src.websocket import EncryptedWebSocketManager, WebSocketMsg


@router.websocket("/opaque/edit-record")
async def edit_record_endpoint(
    websocket: WebSocket,
    credentials: Annotated[Credentials, Depends(get_credentials_ws)],
):
    """
    Endpoint that handles the editing of existing users' records.

    All messages should be encrypted with the current session key of the user.
    """

    OPAQUE = _get_opaque()

    key = MASTER_KEYS_CACHE[credentials.comm_uuid]
    ws_manager = EncryptedWebSocketManager(websocket, key)

    await ws_manager.accept()
    try:
        # Wait for new username and registration request
        registration_request_raw_and_username = (await ws_manager.receive()).data
        registration_request_raw = registration_request_raw_and_username[: OPAQUE.registration_request_size]
        new_username = registration_request_raw_and_username[OPAQUE.registration_request_size :].decode("utf-8")

        # Get current user
        user = get_user_from_id(credentials.user_id)

        # Check if new username is already taken
        if new_username != user.username and get_user(new_username) is not None:
            await ws_manager.send(WebSocketMsg("Username already taken", "ERR"))
            await ws_manager.close()
            return

        # Generate registration response
        registration_request = OPAQUE.deserialize_registration_request(registration_request_raw)
        registration_response = OPAQUE.create_registration_response(
            request=registration_request,
            server_public_key=_get_public_key(),
            credential_identifier=_get_credential_identifier(new_username),
            oprf_seed=_get_oprf_seed(),
        )
        await ws_manager.send(WebSocketMsg(registration_response.serialize()))

        # Wait for client to send registration record, AUK salt, and encrypted vault key
        upload_data = (await ws_manager.receive()).data
        registration_record_raw = upload_data[: OPAQUE.registration_record_size]
        auk_salt = upload_data[OPAQUE.registration_record_size : OPAQUE.registration_record_size + 32]
        key_enc = upload_data[OPAQUE.registration_record_size + 32 :]

        # Amend user's record
        with get_session() as session:
            with session.begin():
                db_user = session.get(User, credentials.user_id)
                db_user.username = new_username
                db_user.registration_record = registration_record_raw
                db_user.auk_salt = auk_salt
                db_user.key_enc = key_enc
                session.add(db_user)

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
