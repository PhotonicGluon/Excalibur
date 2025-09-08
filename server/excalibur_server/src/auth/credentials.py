import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.consts import KEY
from excalibur_server.src.auth.hmac import HMAC_HEADER_PATTERN, generate_hmac, parse_hmac_header

from .jwt import decode_token, generate_token

API_TOKEN_HEADER = HTTPBearer(scheme_name="SRP-Identity", auto_error=False)
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Missing, invalid, or expired bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def generate_auth_token(username: str, comm_uuid: str, expiry_timestamp: float) -> str:
    """
    Generates a JWT token for the given E2EE key and expiry timestamp.

    :param username: the username
    :param comm_uuid: the UUID of the communication session
    :param expiry_timestamp: the timestamp when the token expires
    :return: a serialized JWT
    """

    return generate_token(
        sub=username,
        data={"uuid": comm_uuid},
        key=KEY,
        expiry=int(round(expiry_timestamp - datetime.now(tz=timezone.utc).timestamp())),
    )


def check_auth_token(token: str) -> bool:
    """
    Checks the validity of the auth token.

    :param token: the auth token
    :return: True if credentials are valid and False otherwise
    """

    decoded = decode_token(token, KEY)
    if decoded is None:
        return False

    comm_uuid = decoded.pop("uuid")
    if comm_uuid not in MASTER_KEYS_CACHE:
        return False

    return True


async def get_credentials(
    request: Request,
    hmac_validation: Annotated[
        str,
        Header(
            alias="X-SRP-HMAC",
            pattern=HMAC_HEADER_PATTERN,
            description="HMAC for authentication.",
        ),
    ] = "",
    credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER),
) -> str:
    """
    Gets the authorization credentials.

    :param credentials: authorization credentials included as the "Bearer" header
    :param x_srp_hmac: the SRP HMAC
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: the username
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    # Check if the provided identity token is valid
    decoded = decode_token(credentials.credentials, KEY)
    if decoded is None:
        raise CREDENTIALS_EXCEPTION
    sub = decoded["sub"]
    comm_uuid = decoded["uuid"]

    if comm_uuid not in MASTER_KEYS_CACHE:
        raise CREDENTIALS_EXCEPTION

    if os.getenv("EXCALIBUR_SERVER_HMAC_ENABLED", "true") != "true":
        # No need to proceed to check header
        return sub

    # Check that the header is valid
    if not hmac_validation:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing HMAC",
            headers={"X-SRP-HMAC": HMAC_HEADER_PATTERN},
        )

    timestamp, nonce, hmac = parse_hmac_header(hmac_validation)

    if timestamp < datetime.now(tz=timezone.utc).timestamp() - 60:  # TODO: Make this configurable
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid timestamp",
            headers={"X-SRP-HMAC": HMAC_HEADER_PATTERN},
        )

    # TODO: Add nonce to cache of known nonces

    # Extract parts needed for the SRP HMAC
    master_key = MASTER_KEYS_CACHE[comm_uuid]
    method = request.method
    path = request.url.path

    # Check if the SRP HMAC is valid
    hmac_computed = generate_hmac(master_key, method, path, timestamp, nonce)
    if hmac_computed != hmac:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid HMAC",
        )
    return sub
