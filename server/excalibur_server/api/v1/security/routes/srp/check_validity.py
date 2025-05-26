import binascii
from base64 import b64decode, b64encode
from typing import Annotated

from Crypto.Util.number import bytes_to_long
from fastapi import Body, HTTPException, status
from pydantic import BaseModel

from excalibur_server.api.v1.security.auth import (
    compute_premaster_secret,
    compute_u,
    generate_m1,
    generate_m2,
    premaster_to_master,
)
from excalibur_server.api.v1.security.auth.srp import get_verifier
from excalibur_server.api.v1.security.cache import HANDSHAKE_CACHE, VALID_UUIDS_CACHE
from excalibur_server.api.v1.security.consts import SRP_GROUP
from excalibur_server.api.v1.security.routes.srp import router
from excalibur_server.api.v1.security.security_details import SECURITY_DETAILS_FILE


class SRPValidityResponse(BaseModel):
    m2: str


@router.post(
    "/check-validity",
    summary="Check Validity of Client",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Handshake UUID not found"},
        status.HTTP_406_NOT_ACCEPTABLE: {"description": "Client public value is illegal"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string for value"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Verifier not found"},
    },
    response_model=SRPValidityResponse,
)
def check_srp_validity_endpoint(
    handshake_uuid: Annotated[str, Body(description="Handshake UUID given by the server during the handshake.")],
    salt: Annotated[str, Body(description="Salt as a base64 encoded string.")],
    client_public_value: Annotated[str, Body(description="Client public value, A, as a base64 encoded string.")],
    server_public_value: Annotated[str, Body(description="Server public value, B, as a base64 encoded string.")],
    m1: Annotated[str, Body(description="M1 value as a base64 encoded string.")],
):
    """
    Checks the validity of the client's computed M1 value, replying with the server's M2 value if correct.
    """

    # Get verifier
    try:
        verifier = get_verifier(SECURITY_DETAILS_FILE)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Verifier not found")

    # Decode incoming values
    try:
        salt: bytes = b64decode(salt)
        a_pub: int = bytes_to_long(b64decode(client_public_value))  # No need to check because handshake already checked
        b_pub: int = bytes_to_long(b64decode(server_public_value))
        m1: bytes = b64decode(m1)
    except binascii.Error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid base64 string for value")

    # Retrieve server private value
    b_priv_b64 = HANDSHAKE_CACHE.get(handshake_uuid)
    if b_priv_b64 is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handshake UUID not found")

    b_priv = bytes_to_long(b64decode(b_priv_b64))

    # Compute server-side master
    u = compute_u(SRP_GROUP, a_pub, b_pub)
    master = premaster_to_master(compute_premaster_secret(SRP_GROUP, a_pub, b_priv, u, verifier))

    # Generate server-side M1
    m1_server = generate_m1(SRP_GROUP, salt, a_pub, b_pub, master)

    # Halt if wrong
    if m1_server != m1:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="M1 values do not match")

    # Update server-side cache of valid UUIDs
    VALID_UUIDS_CACHE[handshake_uuid] = master

    # Generate server-side M2s
    return SRPValidityResponse(m2=b64encode(generate_m2(a_pub, m1_server, master)).decode("UTF-8"))
