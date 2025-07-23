import os
from base64 import b64decode

from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import HTTPException, WebSocket, WebSocketDisconnect, status

from excalibur_server.api.v1.security import router
from excalibur_server.src.security.consts import SRP_GROUP
from excalibur_server.src.security.security_details import SECURITY_DETAILS_FILE, get_security_details
from excalibur_server.src.security.srp import (
    compute_premaster_secret,
    compute_server_public_value,
    compute_u,
    generate_m1,
    generate_m2,
    premaster_to_master,
)


@router.websocket("/srp")
async def srp_websocket_endpoint(websocket: WebSocket):
    """
    Endpoint that handles the SRP interactions.

    Protocol adapted from RFC 5054 section 2.2, which can be found at
        https://datatracker.ietf.org/doc/html/rfc5054#section-2.2
    """

    # Get necessary data from server
    try:
        security_details = get_security_details(SECURITY_DETAILS_FILE)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Security details not found")

    verifier = bytes_to_long(security_details.verifier)

    await websocket.accept()
    try:
        # Compute server's ephemeral values
        b_priv = None
        b_pub = 0
        if (
            os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1"
            and os.environ.get("EXCALIBUR_SERVER_TEST_B_PRIV") is not None
        ):
            b_priv = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"]))

        while b_pub % SRP_GROUP.prime == 0:
            b_priv, b_pub = compute_server_public_value(SRP_GROUP, verifier)

        # Send server's parameters
        await websocket.send_text(str(SRP_GROUP.bits))
        await websocket.send_bytes(security_details.srp_salt)
        await websocket.send_bytes(long_to_bytes(b_pub))

        # Next, await client's public value
        a_pub = bytes_to_long(await websocket.receive_bytes())

        # Check given client public value
        if a_pub % SRP_GROUP.prime == 0:
            await websocket.send_text("ERR")
            await websocket.send_text("Client public value is illegal: A mod N cannot be 0")
            await websocket.close()
            return

        await websocket.send_text("OK")

        # Compute server's master value
        u = compute_u(SRP_GROUP, a_pub, b_pub)
        premaster = compute_premaster_secret(SRP_GROUP, a_pub, b_priv, u, verifier)
        master_server = premaster_to_master(SRP_GROUP, premaster)

        # Wait for client's M1 value
        m1_server = generate_m1(SRP_GROUP, security_details.srp_salt, a_pub, b_pub, master_server)
        print(m1_server.hex())  # TODO: Remove when no more debugging needed
        m1_client = await websocket.receive_bytes()

        if m1_client != m1_server:
            await websocket.send_text("ERR")
            await websocket.send_text("M1 values do not match")
            await websocket.close()
            return

        await websocket.send_text("OK")

        # Generate M2 for client to verify
        m2 = generate_m2(a_pub, m1_server, master_server)
        await websocket.send_bytes(m2)

        # TODO: Also send the token for client to use, but encrypt it first

        # Finally, close connection
        await websocket.close()
    except WebSocketDisconnect:
        pass
