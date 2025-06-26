from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from excalibur_server.src.security.auth.consts import KEY
from excalibur_server.src.security.cache import VALID_UUIDS_CACHE

API_TOKEN_HEADER = HTTPBearer(auto_error=False)
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Missing, invalid, or expired bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def generate_token(data: dict, expiry: int = 3600) -> str:
    """
    Generates a JWT token for the given payload.

    :param data: payload
    :param expiry: number of seconds before the token expires
    :return: a serialized JWT
    """

    data = data.copy()
    now = datetime.now(timezone.utc)
    data.update({"iat": now, "exp": now + timedelta(seconds=expiry)})
    return jwt.encode(data, KEY, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """
    Decodes the given token.

    :param token: serialized JWT
    :return: the decoded payload, or None if the token is invalid or expired
    """

    try:
        decoded: dict = jwt.decode(token, KEY, algorithms=["HS256"])
    except InvalidTokenError:
        return None

    now = datetime.now().timestamp()
    issued_at = decoded.pop("iat")
    if issued_at > now:
        return None

    expiry = decoded.pop("exp", 0)
    if expiry < now:
        return None

    return decoded


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


def check_credentials(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)) -> bool:
    """
    Checks the validity of the authorization credentials.

    :param token: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: `True` if credentials are valid
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    decoded = decode_token(credentials.credentials)
    if decoded is None:
        raise CREDENTIALS_EXCEPTION

    uuid = decoded.get("sub")
    if uuid is None:
        raise CREDENTIALS_EXCEPTION

    if uuid not in VALID_UUIDS_CACHE:
        raise CREDENTIALS_EXCEPTION

    return True
