import json
from base64 import b64encode
from datetime import datetime, timezone
from uuid import uuid4

from Crypto.Cipher import AES
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import WebSocket, WebSocketDisconnect

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.api.logging import logger
from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.srp import SRP
from excalibur_server.src.auth.token.auth import generate_auth_token
from excalibur_server.src.config import CONFIG
from excalibur_server.src.users import User, get_user
from excalibur_server.src.websocket import WebSocketManager, WebSocketMsg

MAX_ITER_COUNT = 3


@router.websocket("")
async def comms_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the authentication communication of incoming requests.

    Uses an adapted SRP protocol from RFC 5054 section 2.2, which can be found at
        https://datatracker.ietf.org/doc/html/rfc5054#section-2.2
    """

    ws_manager = WebSocketManager(websocket)

    await ws_manager.accept()
    try:
        # Get user details
        username = (await ws_manager.receive()).data
        user = get_user(username)
        if user is None:
            await ws_manager.send(WebSocketMsg("User does not exist", "ERR"))
            await ws_manager.close()
            return

        srp_handler = SRP(user.srp_group)

        # Get verifier
        verifier = _get_verifier(user)

        # Send server's SRP group size
        await ws_manager.send(WebSocketMsg(str(srp_handler.bits), "OK"))

        # Negotiate ephemeral values
        output = await _negotiate_ephemeral_values(ws_manager, srp_handler, verifier)
        if output is None:
            # Already handled
            return

        a_pub, b_pub, b_priv = output

        # Check shared U value
        u = srp_handler.compute_u(a_pub, b_pub)
        if u == 0:
            await ws_manager.send(WebSocketMsg("Shared U value is 0", "ERR"))
            await ws_manager.close()
            return
        await ws_manager.send(WebSocketMsg("U is OK", "OK"))

        # Compute server's master value
        premaster = srp_handler.compute_premaster_secret(a_pub, b_priv, u, verifier)
        master_server = srp_handler.premaster_to_master(premaster)

        # Verify client's M1
        srp_salt = user.srp_salt
        m1_server = srp_handler.generate_m1(user.username, srp_salt, a_pub, b_pub, master_server)
        logger.debug(f"M1 server: {b64encode(m1_server).decode('utf-8')}")
        m1_response = await ws_manager.receive()
        if m1_response.status != "OK":
            await ws_manager.close()
            return

        m1_client = m1_response.data
        if m1_client != m1_server:
            await ws_manager.send(WebSocketMsg("M1 values do not match", "ERR"))
            await ws_manager.close()
            return

        # Send server's M2 for client to check
        m2 = srp_handler.generate_m2(a_pub, m1_server, master_server)
        await ws_manager.send(WebSocketMsg(m2, "OK"))
        if (await ws_manager.receive()).status != "OK":
            await ws_manager.close()
            return

        # Add to the master key cache
        uuid = uuid4().hex
        MASTER_KEYS_CACHE[uuid] = master_server

        # Send the auth token for client to use
        await _send_auth_token(ws_manager, user.username, uuid)

        # Finally, close connection
        await ws_manager.close()
    except WebSocketDisconnect:
        pass


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


async def _negotiate_ephemeral_values(
    ws_manager: WebSocketManager, srp_handler: SRP, verifier: int
) -> tuple[int, int, int] | None:
    """
    Negotiate the ephemeral values for the SRP protocol.

    :param ws_manager: the WebSocket manager
    :param srp_handler: the SRP handler
    :param verifier: the verifier
    :return: the ephemeral values
    """

    # Compute server's ephemeral values
    b_priv = _get_b_priv()
    b_pub = 0
    client_accepted = False
    iter_count = 0
    while not client_accepted and iter_count < MAX_ITER_COUNT:
        b_priv, b_pub = srp_handler.compute_server_public_value(verifier, private_value=b_priv)
        await ws_manager.send(WebSocketMsg(long_to_bytes(b_pub)))

        # Await client's response
        response = await ws_manager.receive()
        if response.status == "OK":
            client_accepted = True
        else:
            iter_count += 1

    if not client_accepted:
        await ws_manager.send(WebSocketMsg("ERR", "Client refused all server's public values"))
        await ws_manager.close()
        return

    # Next, await client's public value
    iter_count = 0
    while iter_count < MAX_ITER_COUNT:
        if response.status == "ERR":
            await ws_manager.close()
            return

        a_pub = bytes_to_long(response.data)

        # Check given client public value
        if a_pub % srp_handler.prime != 0:
            break
        else:
            iter_count += 1
            if iter_count == MAX_ITER_COUNT:
                await ws_manager.send(WebSocketMsg("Client tries exceeded", "ERR"))
                await ws_manager.close()
                return

            await ws_manager.send(WebSocketMsg("Client public value is illegal; A mod N cannot be 0", "ERR"))

        response = await ws_manager.receive()

    return a_pub, b_pub, b_priv


async def _send_auth_token(ws_manager: WebSocketManager, username: str, comm_uuid: str) -> None:
    """
    Send the authentication token to the client.

    Encrypts the authentication token using the master value and sends it to the client.

    :param ws_manager: the WebSocket manager
    :param username: the username
    :param comm_uuid: the UUID of the communication session
    """

    auth_token = generate_auth_token(
        username, comm_uuid, datetime.now(tz=timezone.utc).timestamp() + CONFIG.api.login_validity_time
    )

    cipher = AES.new(MASTER_KEYS_CACHE[comm_uuid], AES.MODE_GCM)
    auth_token_enc = cipher.encrypt(auth_token.encode("UTF-8"))
    tag = cipher.digest()

    auth_token_data = json.dumps(
        {
            "nonce": b64encode(cipher.nonce).decode("utf-8"),
            "token": b64encode(auth_token_enc).decode("utf-8"),
            "tag": b64encode(tag).decode("utf-8"),
        }
    )

    await ws_manager.send(WebSocketMsg(auth_token_data))
