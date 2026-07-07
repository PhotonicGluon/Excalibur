from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.enums import AuthProtocol
from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, OPAQUEServer
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.elliptic import NoiseNK, Ristretto255
from excalibur_server.src.db.tables import User
from excalibur_server.src.users import add_user, get_user
from excalibur_server.src.websocket import EncryptedWebSocketManager, WebSocketManager, WebSocketMsg


@router.websocket("/opaque/register")
async def registration_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the registration communication of incoming requests.
    """

    OPAQUE = _get_opaque()
    ws_manager = WebSocketManager(websocket)

    await ws_manager.accept()
    try:
        # Use Noise-NK protocol to set up session key
        noise = NoiseNK(CONFIG.security.account_creation.public_key)

        client_keyshare_pub_and_tag = (await ws_manager.receive()).data
        try:
            client_keyshare_pub = Ristretto255.from_bytes(client_keyshare_pub_and_tag[: Ristretto255.KEY_LENGTH])
            client_tag = client_keyshare_pub_and_tag[Ristretto255.KEY_LENGTH :]
            server_keyshare_pub, server_tag, session_key = noise.message_s_to_c(
                client_keyshare_pub, client_tag, CONFIG.security.account_creation.private_key
            )
        except ValueError:
            await ws_manager.send(WebSocketMsg("Invalid value", status="ERR"))
            await ws_manager.close()
            return

        await ws_manager.send(WebSocketMsg(server_keyshare_pub.to_bytes() + server_tag))

        # Upgrade manager to handle encrypted communications
        ws_manager = EncryptedWebSocketManager(ws_manager._ws, session_key)

        # Wait for username and registration request
        registration_request_raw_and_username = (await ws_manager.receive()).data
        registration_request_raw = registration_request_raw_and_username[: OPAQUE.registration_request_size]
        username = registration_request_raw_and_username[OPAQUE.registration_request_size :].decode("utf-8")

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
        upload_data = (await ws_manager.receive()).data
        registration_record_raw = upload_data[: OPAQUE.registration_record_size]
        auk_salt = upload_data[OPAQUE.registration_record_size : OPAQUE.registration_record_size + 32]
        key_enc = upload_data[OPAQUE.registration_record_size + 32 :]

        # Add the user
        user = User(
            username=username,
            auth_protocol=AuthProtocol.OPAQUE_3DH,
            registration_record=registration_record_raw,
            auk_salt=auk_salt,
            key_enc=key_enc,
        )
        add_user(user)

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

    return OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE)


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
