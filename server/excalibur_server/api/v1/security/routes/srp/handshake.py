import binascii
import os
from base64 import b64decode, b64encode
from typing import Annotated

from Crypto.Random import get_random_bytes
from Crypto.Util.number import bytes_to_long, long_to_bytes
from fastapi import Body, HTTPException, status
from pydantic import BaseModel

from excalibur_server.api.v1.security.auth import compute_server_public_value, get_verifier
from excalibur_server.api.v1.security.cache import HANDSHAKE_CACHE
from excalibur_server.api.v1.security.consts import SRP_GROUP, VERIFIER_FILE
from excalibur_server.api.v1.security.routes.srp import router


class SRPHandshakeResponse(BaseModel):
    handshake_uuid: str
    server_public_value: str


@router.post(
    "/handshake",
    summary="Handshake With Server",
    responses={
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Client public value is illegal"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string for verifier"},
    },
    response_model=SRPHandshakeResponse,
)
def srp_handshake_endpoint(
    client_public_value: Annotated[str, Body(description="Client public value, A, as a base64 encoded string.")],
):
    # Check client's public value
    try:
        a_pub = bytes_to_long(b64decode(client_public_value))
    except binascii.Error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid base64 string for value")

    if a_pub % SRP_GROUP.prime == 0:
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Client public value is illegal: A mod N cannot be 0"
        )

    # Generate server's public (and private) value
    b_priv = None
    if os.environ.get("EXCALIBUR_SERVER_DEBUG") == "1" and os.environ.get("EXCALIBUR_SERVER_TEST_B_PRIV") is not None:
        b_priv = bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"]))
    b_priv, b_pub = compute_server_public_value(SRP_GROUP, get_verifier(VERIFIER_FILE), private_value=b_priv)

    # Save the details in the handshake cache
    handshake_uuid = get_random_bytes(16).hex()
    HANDSHAKE_CACHE[handshake_uuid] = b64encode(long_to_bytes(b_priv)).decode("UTF-8")

    # Return server's public value
    return SRPHandshakeResponse(
        handshake_uuid=handshake_uuid, server_public_value=b64encode(long_to_bytes(b_pub)).decode("UTF-8")
    )
