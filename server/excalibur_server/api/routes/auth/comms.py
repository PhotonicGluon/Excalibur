import json
import os
from base64 import b64decode, b64encode
from datetime import datetime, timezone

from Crypto.Cipher import AES
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.logging import logger
from excalibur_server.api.routes.auth import router
from excalibur_server.src.config import CONFIG
from excalibur_server.src.auth.srp import SRP
from excalibur_server.src.auth.token.auth import generate_auth_token
from excalibur_server.src.users import User, get_user

MAX_ITER_COUNT = 3


@router.websocket("")
async def comms_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the authentication communication of incoming requests.

    Uses an adapted SRP protocol from RFC 5054 section 2.2, which can be found at
        https://datatracker.ietf.org/doc/html/rfc5054#section-2.2
    """

    await websocket.accept()
    try:
        # Get user details
        user = await _get_user(websocket)
        if user is None:
            return

        srp_handler = SRP(user.srp_group)

        # Get verifier
        verifier = _get_verifier(user)

        # Send server's SRP group size
        await websocket.send_text(str(srp_handler.bits))

        # Compute server's ephemeral values
        result = await _compute_ephemeral_values(websocket, srp_handler, verifier)
        if result is None:
            return
        b_priv, b_pub = result

        # Next, await client's public value
        a_pub = await _get_client_public_value(websocket, srp_handler)
        if a_pub is None:
            return

        # Check shared U value
        u = await _check_shared_u(websocket, srp_handler, a_pub, b_pub)
        if u is None:
            return

        # Compute server's master value
        premaster = srp_handler.compute_premaster_secret(a_pub, b_priv, u, verifier)
        master_server = srp_handler.premaster_to_master(premaster)

        # Check M values
        if not await _verify_m_values(websocket, srp_handler, user, a_pub, b_pub, master_server):
            return

        # Send the auth token for client to use
        await _send_auth_token(websocket, user.username, master_server)

        # Finally, close connection
        await websocket.close()
    except WebSocketDisconnect:
        pass


async def _get_user(websocket: WebSocket) -> User | None:
    """
    Get the user details.

    :param websocket: the WebSocket connection to the client
    :return: the user, or None if the computation fails
    """

    username = await websocket.receive_text()
    user = get_user(username)
    if user is None:
        await websocket.send_text("ERR: User does not exist")
        await websocket.close()
        return None

    await websocket.send_text("OK")
    return user


def _get_verifier(user: User) -> int:
    """
    Get the verifier for the user.

    The extraction of the verifier from the user object is done this way so that we can monkeypatch
    it in tests.

    :param user: the user
    :return: the verifier
    """

    return bytes_to_long(user.srp_verifier)


def _get_b_priv() -> int | None:
    """
    Get the server's private value.

    The extraction of the verifier from the user object is done this way so that we can monkeypatch
    it in tests.

    :return: the verifier
    """

    return None


async def _compute_ephemeral_values(websocket: WebSocket, srp_handler: SRP, verifier: int) -> tuple[int, int] | None:
    """
    Compute the server's ephemeral values.

    :param websocket: the WebSocket connection to the client
    :param srp_handler: the SRP handler to use for the SRP protocol
    :param verifier: the verifier to use for the SRP protocol
    :return: a tuple of the server's private and public values, or None if the computation fails
    """

    b_priv = _get_b_priv()
    b_pub = 0

    # Compute server's ephemeral values
    client_accepted = False
    iter_count = 0
    while not client_accepted and iter_count < MAX_ITER_COUNT:
        b_priv, b_pub = srp_handler.compute_server_public_value(verifier, private_value=b_priv)
        await websocket.send_bytes(long_to_bytes(b_pub))

        # Await client's response
        response = await websocket.receive_text()
        if response == "OK":
            client_accepted = True
        else:
            iter_count += 1

    if not client_accepted:
        await websocket.send_text("ERR: Client refused all server's public values")
        await websocket.close()
        return None

    return b_priv, b_pub


async def _get_client_public_value(websocket: WebSocket, srp_handler: SRP) -> int | None:
    """
    Get the client's public value.

    :param websocket: the WebSocket connection to the client
    :param srp_handler: the SRP handler to use for the SRP protocol
    :return: the client's public value, or None if the computation fails
    """

    iter_count = 0
    while iter_count < MAX_ITER_COUNT:
        a_pub = bytes_to_long(await websocket.receive_bytes())

        # Check given client public value
        if a_pub % srp_handler.prime != 0:
            await websocket.send_text("OK")
            break
        else:
            await websocket.send_text("ERR: Client public value is illegal; A mod N cannot be 0")
            iter_count += 1

    if a_pub % srp_handler.prime == 0:
        await websocket.close()
        return

    return a_pub


async def _check_shared_u(websocket: WebSocket, srp_handler: SRP, a_pub: int, b_pub: int) -> int | None:
    """
    Check the shared U value.

    :param websocket: the WebSocket connection to the client
    :param srp_handler: the SRP handler to use for the SRP protocol
    :param a_pub: the client's public value
    :param b_pub: the server's public value
    :return: the shared U value, or None if the computation fails
    """

    u = srp_handler.compute_u(a_pub, b_pub)
    if u == 0:
        await websocket.send_text("ERR: Shared U value is zero")
        await websocket.close()
        return None
    await websocket.send_text("U is OK")
    return u


async def _verify_m_values(
    websocket: WebSocket, srp_handler: SRP, user: User, a_pub: int, b_pub: int, master_server: bytes
) -> bool:
    """
    Verify the M values.

    Checks the received client's M1 value. If valid, sends the server's M2 value for the client to check.

    :param websocket: the WebSocket connection to the client
    :param srp_handler: the SRP handler to use for the SRP protocol
    :param user: the user
    :param a_pub: the client's public value
    :param b_pub: the server's public value
    :param master_server: the server's master value
    :return: True if the M values are valid, False otherwise
    """

    srp_salt = user.srp_salt
    if os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1" and os.environ.get("EXCALIBUR_SERVER_TEST_SRP_SALT") is not None:
        srp_salt = b64decode(os.environ["EXCALIBUR_SERVER_TEST_SRP_SALT"])

    # Verify client's M1
    m1_server = srp_handler.generate_m1(user.username, srp_salt, a_pub, b_pub, master_server)
    logger.debug(f"M1 server: {m1_server.hex()}")
    m1_client = await websocket.receive_bytes()

    if m1_client != m1_server:
        await websocket.send_text("ERR: M1 values do not match")
        await websocket.close()
        return False

    await websocket.send_text("OK")

    # Send server's M2 for client to check
    m2 = srp_handler.generate_m2(a_pub, m1_server, master_server)
    await websocket.send_bytes(m2)
    if await websocket.receive_text() != "OK":
        await websocket.close()
        return False

    return True


async def _send_auth_token(websocket: WebSocket, username: str, master: bytes) -> None:
    """
    Send the authentication token to the client.

    Encrypts the authentication token using the master value and sends it to the client.

    :param username: the username
    :param websocket: the WebSocket connection to the client
    :param master: the master value to use for the authentication token
    """

    auth_token = generate_auth_token(
        username, master, datetime.now(tz=timezone.utc).timestamp() + CONFIG.api.login_validity_time
    )

    cipher = AES.new(master, AES.MODE_GCM)
    auth_token_enc = cipher.encrypt(auth_token.encode("UTF-8"))
    tag = cipher.digest()

    auth_token_data = json.dumps(
        {
            "nonce": b64encode(cipher.nonce).decode("utf-8"),
            "token": b64encode(auth_token_enc).decode("utf-8"),
            "tag": b64encode(tag).decode("utf-8"),
        }
    )

    await websocket.send_text(auth_token_data)
