import jwt
from Crypto.Random import get_random_bytes
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from excalibur_server.api.misc import is_debug

KEYSIZE = 256  # In bits
if is_debug():
    KEY = "test_key"
else:
    KEY = get_random_bytes(KEYSIZE // 8)

API_TOKEN_HEADER = HTTPBearer(auto_error=False)
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Missing or invalid bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def generate_token(data: dict) -> str:
    """
    Generates a JWT token for the given payload.

    :param data: payload
    :return: a serialized JWT
    """

    return jwt.encode(data, KEY, algorithm="HS256")


def check_token(token: str) -> bool:
    """
    Checks the validity of the token.

    :param token: serialized JWT
    :return: whether the provided token is valid
    """

    try:
        jwt.decode(token, KEY, algorithms=["HS256"])
    except InvalidTokenError:
        return False

    # TODO: More checks

    return True


def check_credentials(credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER)) -> bool:
    """
    Checks the validity of the authorization credentials.

    :param token: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: `True` if credentials are valid
    """

    if not credentials:
        raise CREDENTIALS_EXCEPTION

    if check_token(credentials.credentials):
        return True

    raise CREDENTIALS_EXCEPTION
