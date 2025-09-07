import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError


def _generate_key(username: str, key: bytes) -> bytes:
    """
    Generates a key for the given username.

    :param username: the username
    :param key: the key to use for the token
    :return: the generated key
    """

    return hashlib.sha3_256(username.encode("utf-8") + key).digest()


def generate_token(sub: str, data: dict, key: bytes, expiry: int = 3600) -> str:
    """
    Generates a JWT token for the given payload.

    :param sub: the subject of the token
    :param data: payload
    :param key: the key to use for the token
    :param expiry: number of seconds before the token expires
    :return: a serialized JWT
    """

    data = data.copy()
    now = datetime.now(timezone.utc)
    data.update({"sub": sub, "iat": now, "exp": now + timedelta(seconds=expiry)})
    return jwt.encode(data, _generate_key(sub, key), algorithm="HS256")


def decode_token(token: str, key: bytes) -> dict | None:
    """
    Decodes the given token.

    :param token: serialized JWT
    :param sub: the subject of the token
    :param key: the key to use for the token
    :return: the decoded payload, or None if the token is invalid or expired
    """

    # Try to get the subject
    try:
        decoded: dict = jwt.decode(token, options={"verify_signature": False})
    except InvalidTokenError:
        return None
    sub = decoded.pop("sub")

    # Then properly verify the token
    try:
        decoded: dict = jwt.decode(token, key=_generate_key(sub, key), algorithms=["HS256"])
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
