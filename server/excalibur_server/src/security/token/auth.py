from datetime import datetime, timezone

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from excalibur_server.src.security.cache import VALID_UUIDS_CACHE

from .jwt import decode_token, generate_token

API_TOKEN_HEADER = HTTPBearer(auto_error=False)
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Missing, invalid, or expired bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def generate_auth_token(uuid: str, expiry_timestamp: float) -> str:
    """
    Generates a JWT token for the given UUID and expiry timestamp.

    :param uuid: the subject of the token
    :param expiry_timestamp: the timestamp when the token expires
    :return: a serialized JWT
    """

    return generate_token(
        {"sub": uuid},
        expiry=int(round(expiry_timestamp - datetime.now(timezone.utc).timestamp())),
    )


def check_auth_token(token: str) -> bool:
    """
    Checks the validity of the auth token.

    :param token: the auth token
    :return: True if credentials are valid and False otherwise
    """

    decoded = decode_token(token)
    if decoded is None:
        return False

    uuid = decoded.get("sub")
    if uuid is None:
        return False

    if uuid not in VALID_UUIDS_CACHE:
        return False

    return True


def check_credentials(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)) -> bool:
    """
    Checks the validity of the authorization credentials.

    :param credentials: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: `True` if credentials are valid
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    check = check_auth_token(credentials.credentials)
    if not check:
        raise CREDENTIALS_EXCEPTION
    return True
