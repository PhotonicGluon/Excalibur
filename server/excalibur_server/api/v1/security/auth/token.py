from datetime import datetime, timedelta

import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from excalibur_server.api.v1.security.auth.consts import KEY

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
    data.update({"exp": datetime.now() + timedelta(seconds=expiry)})
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

    expiry = decoded.pop("exp", 0)
    if expiry < datetime.now().timestamp():
        return None

    return decoded


def check_credentials(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)) -> bool:
    """
    Checks the validity of the authorization credentials.

    :param token: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: `True` if credentials are valid
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    if decode_token(credentials.credentials) is not None:
        return True

    raise CREDENTIALS_EXCEPTION
