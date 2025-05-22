from base64 import b64decode, b64encode
import os
from typing import Annotated

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import Body, HTTPException, status

from excalibur_server.api.v1.security import router
from excalibur_server.api.v1.security.auth import compute_server_public_value, generate_token, get_verifier
from excalibur_server.api.v1.security.auth.token import KEY
from excalibur_server.api.v1.security.consts import SRP_GROUP, SRP_HANDSHAKE_TIME, VERIFIER_FILE


@router.post(
    "/handshake",
    summary="Handshake With Server",
    responses={
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Client public value is illegal"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string for verifier"},
    },
)
def srp_handshake_endpoint(
    client_public_value: Annotated[str, Body(description="Client public value, A, as a base64 encoded string.")],
):
    # Check client's public value
    a_pub = bytes_to_long(b64decode(client_public_value))
    if a_pub % SRP_GROUP.prime == 0:
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Client public value is illegal: A mod N cannot be 0"
        )

    # Generate server's public (and private) value
    if os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1":
        b_priv = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"]))
    else:
        b_priv = None
    b_priv, b_pub = compute_server_public_value(SRP_GROUP, get_verifier(VERIFIER_FILE), private_value=b_priv)

    # Use AES to secure the private value before setting it as a cookie
    pt = long_to_bytes(b_priv)
    nonce = get_random_bytes(16)
    cipher = AES.new(KEY, AES.MODE_GCM, nonce=nonce, mac_len=16)
    ct = cipher.encrypt(pt)
    jwt_priv = generate_token(
        {"ct": b64encode(ct).decode("UTF-8"), "nonce": b64encode(nonce).decode("UTF-8")}, SRP_HANDSHAKE_TIME
    )

    # Return server's public value
    response = {"server_public_value": b64encode(long_to_bytes(b_pub)).decode("UTF-8"), "handshake": jwt_priv}

    return response
