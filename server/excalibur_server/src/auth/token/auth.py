from base64 import b64encode
from datetime import datetime, timezone

from Crypto.Cipher import AES
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from excalibur_server.src.auth.consts import KEY

from .jwt import decode_token, generate_token

API_TOKEN_HEADER = HTTPBearer(auto_error=False)
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Missing, invalid, or expired bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def generate_auth_token(username: str, e2ee_key: bytes, expiry_timestamp: float) -> str:
    """
    Generates a JWT token for the given E2EE key and expiry timestamp.

    :param username: the username
    :param e2ee_key: the E2EE key
    :param expiry_timestamp: the timestamp when the token expires
    :return: a serialized JWT
    """

    cipher = AES.new(KEY, AES.MODE_GCM)
    return generate_token(
        sub=username,
        data={
            "e2ee": {
                "nonce": b64encode(cipher.nonce).decode("utf-8"),
                "key": b64encode(cipher.encrypt(e2ee_key)).decode("utf-8"),
                "tag": b64encode(cipher.digest()).decode("utf-8"),
            },
        },
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
