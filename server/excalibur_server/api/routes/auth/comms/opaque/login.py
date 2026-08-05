from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.routes.auth import router
from excalibur_server.consts import FAKE_USER_UUID
from excalibur_server.src.auth.credentials import generate_auth_token
from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, SERVER_IDENTITY, OPAQUEServer
from excalibur_server.src.auth.opaque.operation.base import OPAQUEAuthError, OPAQUEClientAuthError
from excalibur_server.src.config import CONFIG
from excalibur_server.src.crypto.elliptic import Ristretto255
from excalibur_server.src.crypto.exef import ExEF
from excalibur_server.src.users import get_user, get_user_from_id
from excalibur_server.src.websocket import WebSocketManager, WebSocketMsg


@router.websocket("/opaque")
async def comms_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the authentication communication of incoming requests.
    """

    OPAQUE = _get_opaque()
    ws_manager = WebSocketManager(websocket)

    await ws_manager.accept()
    try:
        # Pre-get the fake user
        # (This is to prevent side-channel client enumeration attacks. See RFC9807 Section 10.9)
        fake_user = get_user_from_id(FAKE_USER_UUID)

        # Wait for username and first key exchange message
        ke1_raw_and_username = (await ws_manager.receive()).data
        ke1_raw = ke1_raw_and_username[: OPAQUE.ke1_size]
        username = ke1_raw_and_username[OPAQUE.ke1_size :].decode("utf-8")

        # Check username
        user = get_user(username)
        if user is None:
            # Use fake user's data
            # (We fully expect that the authentication fails)
            user = fake_user

        # Generate second key exchange message
        ke1 = OPAQUE.deserialize_ke1(ke1_raw)
        try:
            ke2 = OPAQUE.generate_ke2(
                server_identity=_get_server_identity(),
                server_private_key=_get_private_key(),
                server_public_key=_get_public_key(),
                record=OPAQUE.deserialize_registration_record(user.registration_record),
                credential_identifier=_get_credential_identifier(username),
                oprf_seed=_get_oprf_seed(),
                ke1=ke1,
                client_identity=_get_client_identity(username),
                # For testing only. These values are usually set to `None`
                masking_nonce=_get_masking_nonce(),
                nonce=_get_nonce(),
                keyshare_seed=_get_keyshare_seed(),
            )
        except OPAQUEAuthError:
            await ws_manager.send(WebSocketMsg("Failed to generate KE2", "ERR"))
            await ws_manager.close()
            return

        await ws_manager.send(WebSocketMsg(ke2.serialize()))

        # Wait for client to send final key exchange message
        ke3_raw = (await ws_manager.receive()).data
        recv_time = datetime.now().astimezone()
        ke3 = OPAQUE.deserialize_ke3(ke3_raw)

        # Finalize the key exchange, generating the session key
        try:
            session_key = OPAQUE.finish(ke3)
        except OPAQUEClientAuthError:
            await ws_manager.send("Failed to authenticate client", "ERR")
            await ws_manager.close()
            return

        # Derive master key by HKDFing the session key
        master_key = OPAQUE.kdf.expand(session_key, b"Master Key", 32)

        # Add to the master key cache
        uuid = uuid4().hex
        MASTER_KEYS_CACHE[uuid] = master_key

        # Give client authentication information
        await _send_auth_response(ws_manager, user.id, uuid, recv_time)

        # Finally, close connection
        await ws_manager.close()
    except WebSocketDisconnect:
        pass


async def _send_auth_response(ws_manager: WebSocketManager, user_id: UUID, comm_uuid: str, recv_time: datetime) -> None:
    """
    Send the authentication response to the client, which includes the time-sync timestamps, maximum
    file size, and auth token for the client to use.

    The values are all encrypted using the master key and then sent to the client.

    :param ws_manager: the WebSocket manager
    :param user_id: the ID of the user
    :param comm_uuid: the UUID of the communication session
    :param recv_time: time on that server that the server received the client's KE3 message
    """

    auth_token = generate_auth_token(
        str(user_id), comm_uuid, datetime.now(tz=UTC).timestamp() + CONFIG.security.session_duration
    )
    tx_time = datetime.now().astimezone()

    response = f"{recv_time.isoformat()} {tx_time.isoformat()} {CONFIG.storage.max_upload_size} {auth_token}"
    encrypted_response = ExEF(MASTER_KEYS_CACHE[comm_uuid]).encrypt(response.encode("UTF-8"))
    await ws_manager.send(WebSocketMsg(encrypted_response))


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


def _get_private_key() -> int:
    """
    Get the server private key.

    The extraction of the server private key is done this way so that we can monkeypatch it in tests.

    :return: the server private key
    """

    return CONFIG.security.opaque.private_key


def _get_client_identity(username: str) -> bytes:
    """
    Get the client identity.

    The extraction of the client identity is done this way so that we can monkeypatch it in tests.

    :param username: the username
    :return: the client identity
    """

    return username.encode()


def _get_server_identity() -> bytes:
    """
    Get the server identity.

    The extraction of the server identity is done this way so that we can monkeypatch it in tests.

    :return: the server identity
    """

    return SERVER_IDENTITY


def _get_credential_identifier(username: str) -> bytes:
    """
    Get the credential identifier.

    The extraction of the credential identifier is done this way so that we can monkeypatch it in tests.

    :param username: the username
    :return: the credential identifier
    """

    return username.encode()


def _get_masking_nonce() -> bytes | None:
    """
    Get the masking nonce.

    The extraction of the masking nonce is done this way so that we can monkeypatch it in tests.

    :return: the masking nonce
    """

    return None


def _get_nonce() -> bytes | None:
    """
    Get the nonce.

    The extraction of the nonce is done this way so that we can monkeypatch it in tests.

    :return: the nonce
    """

    return None


def _get_keyshare_seed() -> bytes | None:
    """
    Get the keyshare seed.

    The extraction of the keyshare seed is done this way so that we can monkeypatch it in tests.

    :return: the keyshare seed
    """

    return None
