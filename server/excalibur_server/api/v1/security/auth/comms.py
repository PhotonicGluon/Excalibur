import json
import os
from base64 import b64decode, b64encode
from datetime import datetime, timezone

from Crypto.Cipher import AES
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import HTTPException, WebSocket, WebSocketDisconnect, status

from excalibur_server.api.v1.security.auth import router
from excalibur_server.src.security.consts import LOGIN_VALIDITY_TIME, SRP_HANDLER
from excalibur_server.src.security.security_details import SECURITY_DETAILS_FILE, get_security_details
from excalibur_server.src.security.token.auth import generate_auth_token

MAX_ITER_COUNT = 3


@router.websocket("/")
async def comms_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the authentication communication of incoming requests.

    Uses an adapted SRP protocol from RFC 5054 section 2.2, which can be found at
        https://datatracker.ietf.org/doc/html/rfc5054#section-2.2
    """

    # Get necessary data from server
    try:
        security_details = get_security_details(SECURITY_DETAILS_FILE)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Security details not found")

    verifier = bytes_to_long(security_details.verifier)
    if (
        os.environ.get("EXCALIBUR_SERVER_DEBUG", "0") == "1"
        and os.environ.get("EXCALIBUR_SERVER_TEST_VERIFIER") is not None
    ):
        verifier = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_VERIFIER"]))

    await websocket.accept()
    try:
        # Send server's SRP group size
        await websocket.send_text(str(SRP_HANDLER.bits))

        # Compute server's ephemeral values
        b_priv = None
        b_pub = 0
        if (
            os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1"
            and os.environ.get("EXCALIBUR_SERVER_TEST_B_PRIV") is not None
        ):
            b_priv = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"]))

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
            return

        # Next, await client's public value
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

        # Check shared U value
        u = SRP_HANDLER.compute_u(a_pub, b_pub)
        if u == 0:
            await websocket.send_text("ERR: Shared U value is zero")
            await websocket.close()
            return
        await websocket.send_text("U is OK")

        # Compute server's master value
        premaster = SRP_HANDLER.compute_premaster_secret(a_pub, b_priv, u, verifier)
        master_server = SRP_HANDLER.premaster_to_master(premaster)

        # Wait for client's M1 value
        srp_salt = security_details.srp_salt
        if (
            os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1"
            and os.environ.get("EXCALIBUR_SERVER_TEST_SRP_SALT") is not None
        ):
            srp_salt = b64decode(os.environ["EXCALIBUR_SERVER_TEST_SRP_SALT"])
        m1_server = SRP_HANDLER.generate_m1(srp_salt, a_pub, b_pub, master_server)
        m1_client = await websocket.receive_bytes()

        if m1_client != m1_server:
            await websocket.send_text("ERR: M1 values do not match")
            await websocket.close()
            return

        await websocket.send_text("OK")

        # Generate M2 for client to verify
        m2 = SRP_HANDLER.generate_m2(a_pub, m1_server, master_server)
        await websocket.send_bytes(m2)
        if await websocket.receive_text() != "OK":
            await websocket.close()
            return

        # Send the auth token for client to use, after encrypting with the master
        auth_token = generate_auth_token(master_server, datetime.now(tz=timezone.utc).timestamp() + LOGIN_VALIDITY_TIME)

        cipher = AES.new(master_server, AES.MODE_GCM)
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

        # Finally, close connection
        await websocket.close()
    except WebSocketDisconnect:
        pass
