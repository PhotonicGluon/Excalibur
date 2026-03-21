from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.elliptic.abc import BaseCurve
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque import OPAQUE
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import add_user, get_user
from excalibur_server.src.websocket import EncryptedWebSocketManager, WebSocketMsg


@router.websocket("/opaque/register")
async def registration_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the registration communication of incoming requests.

    All messages should be encrypted with the Account Creation Key (ACK).
    """

    OPAQUE = _get_opaque()
    ws_manager = EncryptedWebSocketManager(websocket, CONFIG.security.account_creation_key)

    await ws_manager.accept()
    try:
        # Wait for username and registration request
        username = (await ws_manager.receive()).data
        registration_request_raw = (await ws_manager.receive()).data

        # Check username
        user = get_user(username)
        if user is not None:
            await ws_manager.send(WebSocketMsg("User already exists", "ERR"))
            await ws_manager.close()
            return

        # Generate registration response
        registration_request = OPAQUE.deserialize_registration_request(registration_request_raw)
        registration_response = OPAQUE.create_registration_response(
            request=registration_request,
            server_public_key=_get_public_key(),
            credential_identifier=_get_credential_identifier(username),
            oprf_seed=_get_oprf_seed(),
        )
        await ws_manager.send(WebSocketMsg(registration_response.serialize()))

        # Wait for client to send registration record, AUK salt, and encrypted vault key
        registration_record_raw = (await ws_manager.receive()).data
        auk_salt = (await ws_manager.receive()).data
        key_enc = (await ws_manager.receive()).data

        # Add new user
        user = User(
            username=username,
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            registration_record=registration_record_raw,
            auk_salt=auk_salt,
            key_enc=key_enc,
        )
        add_user(user)

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


def _get_public_key() -> BaseCurve:
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
