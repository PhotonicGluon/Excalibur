from base64 import b64decode, b64encode
from typing import Annotated

from Crypto.Cipher import AES
from Crypto.Util.number import bytes_to_long
from fastapi import Body, HTTPException, status

from excalibur_server.api.v1.security import router
from excalibur_server.api.v1.security.auth import (
    compute_premaster_secret,
    compute_u,
    decode_token,
    generate_m1,
    generate_m2,
    premaster_to_master,
)
from excalibur_server.api.v1.security.auth.srp import get_verifier
from excalibur_server.api.v1.security.auth.token import KEY, generate_token
from excalibur_server.api.v1.security.consts import SRP_GROUP, VERIFIER_FILE


@router.post(
    "/generate-token",
    summary="Generate Token",
)
def generate_token_endpoint(
    salt: Annotated[str, Body(description="Salt as a base64 encoded string.")],
    client_public_value: Annotated[str, Body(description="Client public value, A, as a base64 encoded string.")],
    server_public_value: Annotated[str, Body(description="Server public value, B, as a base64 encoded string.")],
    m1: Annotated[str, Body(description="M1 value as a base64 encoded string.")],
    handshake: Annotated[str, Body(description="Handshake JWT value.")],
):
    # Decode incoming values
    salt = b64decode(salt)
    a_pub = bytes_to_long(b64decode(client_public_value))
    b_pub = bytes_to_long(b64decode(server_public_value))
    m1 = b64decode(m1)

    # Retrieve server private value
    decoded = decode_token(handshake)
    ct, nonce = b64decode(decoded["ct"]), b64decode(decoded["nonce"])
    cipher = AES.new(KEY, AES.MODE_GCM, nonce=nonce, mac_len=16)
    pt = cipher.decrypt(ct)
    b_priv = bytes_to_long(pt)

    # Compute server-side master
    u = compute_u(SRP_GROUP, a_pub, b_pub)
    master = premaster_to_master(compute_premaster_secret(SRP_GROUP, a_pub, b_priv, u, get_verifier(VERIFIER_FILE)))

    # Generate server-side M1
    m1_server = generate_m1(SRP_GROUP, salt, a_pub, b_pub, master)

    # Halt if wrong
    if m1_server != m1:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="M1 values do not match")

    # Generate server-side M2
    m2_server = generate_m2(a_pub, m1_server, master)

    # Generate token for continued authentication
    token = generate_token({"valid": True})  # TODO: Do we need more stuff?

    return {"m2": b64encode(m2_server).decode("UTF-8"), "token": token}
