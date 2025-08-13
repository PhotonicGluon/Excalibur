import json
import os
from base64 import b64decode, b64encode
from datetime import datetime, timezone

from Crypto.Cipher import AES
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.routes.auth import router
from excalibur_server.src.config import CONFIG
from excalibur_server.src.security.consts import SRP_HANDLER
from excalibur_server.src.security.token.auth import generate_auth_token
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

        # Get verifier
        if (
            os.environ.get("EXCALIBUR_SERVER_DEBUG", "0") == "1"
            and os.environ.get("EXCALIBUR_SERVER_TEST_VERIFIER") is not None
        ):
            verifier = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_VERIFIER"]))
        else:
            verifier = bytes_to_long(user.verifier)

        # Send server's SRP group size
        await websocket.send_text(str(SRP_HANDLER.bits))

        # Compute server's ephemeral values
        result = await _compute_ephemeral_values(websocket, verifier)
        if result is None:
            return
        b_priv, b_pub = result

        # Next, await client's public value
        a_pub = await _get_client_public_value(websocket)
        if a_pub is None:
            return

        # Check shared U value
        u = await _check_shared_u(websocket, a_pub, b_pub)
        if u is None:
            return

        # Compute server's master value
        premaster = SRP_HANDLER.compute_premaster_secret(a_pub, b_priv, u, verifier)
        master_server = SRP_HANDLER.premaster_to_master(premaster)

        # Check M values
        if not await _verify_m_values(websocket, user, a_pub, b_pub, master_server):
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


async def _compute_ephemeral_values(websocket: WebSocket, verifier: int) -> tuple[int, int] | None:
    """
    Compute the server's ephemeral values.

    :param websocket: the WebSocket connection to the client
    :param verifier: the verifier to use for the SRP protocol
    :return: a tuple of the server's private and public values, or None if the computation fails
    """

    # Check if we are running tests
    b_priv = None
    b_pub = 0
    if os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1" and os.environ.get("EXCALIBUR_SERVER_TEST_B_PRIV") is not None:
        b_priv = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"]))

    # Compute server's ephemeral values
    client_accepted = False
    iter_count = 0
    while not client_accepted and iter_count < MAX_ITER_COUNT:
        b_priv, b_pub = SRP_HANDLER.compute_server_public_value(verifier, private_value=b_priv)
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


async def _get_client_public_value(websocket: WebSocket) -> int | None:
    """
    Get the client's public value.

    :param websocket: the WebSocket connection to the client
    :return: the client's public value, or None if the computation fails
    """

    iter_count = 0
    while iter_count < MAX_ITER_COUNT:
        a_pub = bytes_to_long(await websocket.receive_bytes())

        # Check given client public value
        if a_pub % SRP_HANDLER.prime != 0:
            await websocket.send_text("OK")
            break
        else:
            await websocket.send_text("ERR: Client public value is illegal; A mod N cannot be 0")
            iter_count += 1

    if a_pub % SRP_HANDLER.prime == 0:
        await websocket.close()
        return

    return a_pub


async def _check_shared_u(websocket: WebSocket, a_pub: int, b_pub: int) -> int | None:
    """
    Check the shared U value.

    :param websocket: the WebSocket connection to the client
    :param a_pub: the client's public value
    :param b_pub: the server's public value
    :return: the shared U value, or None if the computation fails
    """

    u = SRP_HANDLER.compute_u(a_pub, b_pub)
    if u == 0:
        await websocket.send_text("ERR: Shared U value is zero")
        await websocket.close()
        return None
    await websocket.send_text("U is OK")
    return u


async def _verify_m_values(websocket: WebSocket, user: User, a_pub: int, b_pub: int, master_server: bytes) -> bool:
    """
    Verify the M values.

    Checks the received client's M1 value. If valid, sends the server's M2 value for the client to check.

    :param websocket: the WebSocket connection to the client
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
    m1_server = SRP_HANDLER.generate_m1(srp_salt, a_pub, b_pub, master_server)
    m1_client = await websocket.receive_bytes()

    if m1_client != m1_server:
        await websocket.send_text("ERR: M1 values do not match")
        await websocket.close()
        return False

    await websocket.send_text("OK")

    # Send server's M2 for client to check
    m2 = SRP_HANDLER.generate_m2(a_pub, m1_server, master_server)
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
