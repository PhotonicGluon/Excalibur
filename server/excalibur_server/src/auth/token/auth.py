from datetime import datetime, timezone

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.consts import KEY

from .jwt import decode_token, generate_token

API_TOKEN_HEADER = HTTPBearer(auto_error=False)
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


def get_credentials(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)) -> str:
    """
    Gets the authorization credentials.

    :param credentials: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: the username
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    decoded = decode_token(credentials.credentials, KEY)
    if decoded is None:
        raise CREDENTIALS_EXCEPTION
    return decoded["sub"]
