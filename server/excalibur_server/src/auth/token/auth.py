import re
from datetime import datetime, timezone
from hmac import HMAC
from typing import Annotated

from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.consts import KEY
from excalibur_server.src.exef.exef import ExEF

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


HMAC_HEADER_PATTERN = r"^(?<timestamp>[0-9]{10}) (?<nonce>[a-f0-9]{16}) (?<hmac>[a-f0-9]{64})$"


async def get_credentials(
    request: Request,
    hmac_validation: Annotated[
        str,
        Header(
            alias="X-SRP-HMAC",
            pattern=HMAC_HEADER_PATTERN,
            description="HMAC for authentication.",
        ),
    ],
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

    # Check that the header is valid
    match = re.match(HMAC_HEADER_PATTERN.replace(r"?<", r"?P<"), hmac_validation)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing HMAC",
            headers={"X-SRP-HMAC": HMAC_HEADER_PATTERN},
        )

    timestamp = int(match.group("timestamp"))
    nonce = match.group("nonce")
    hmac = match.group("hmac")

    if timestamp < datetime.now(tz=timezone.utc).timestamp() - 60:  # TODO: Make this configurable
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid timestamp",
            headers={"X-SRP-HMAC": HMAC_HEADER_PATTERN},
        )

    # Check if the provided identity token is valid
    decoded = decode_token(credentials.credentials, KEY)
    if decoded is None:
        raise CREDENTIALS_EXCEPTION
    sub = decoded["sub"]
    comm_uuid = decoded["uuid"]

    if comm_uuid not in MASTER_KEYS_CACHE:
        raise CREDENTIALS_EXCEPTION

    master_key = MASTER_KEYS_CACHE[comm_uuid]

    # Check if the SRP HMAC is valid
    method = request.method
    path = request.url.path
    body = await request.body()
    if body and request.headers.get("X-Encrypt") == "true":
        signature = body[-ExEF.footer_size :]
    else:
        signature = b""

    hmac_msg = f"{method} {path} {timestamp} {nonce} ".encode("UTF-8") + signature
    hmac_computed = HMAC(master_key, hmac_msg, "sha256").hexdigest()
    if hmac_computed != hmac:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid HMAC",
        )
    return sub
