from datetime import UTC, datetime, timedelta

import jwt
from jwt.exceptions import InvalidTokenError

from excalibur_server.src.crypto.hkdf import HKDF

REQUIRED_JWT_FIELDS = {"sub", "iat", "exp"}


def _generate_key(username: str, key: bytes) -> bytes:
    """
    Generates a key for the given username.

    :param username: the username
    :param key: the key to use for the token
    :return: the generated key
    """

    hkdf = HKDF("sha256")
    return hkdf.hkdf(key, b"", username.encode("utf-8"), hkdf.digest_size)


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
    now = datetime.now(tz=UTC)
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

    # Ensure that we received a valid JWT
    try:
        decoded: dict = jwt.decode(token, options={"verify_signature": False})
    except InvalidTokenError:
        return None

    # Check if required keys are present
    for required_key in REQUIRED_JWT_FIELDS:
        if required_key not in decoded:
            return None

    sub = decoded.pop("sub")
    issued_at = decoded.pop("iat")
    expiry = decoded.pop("exp", 0)

    # Then properly verify the token
    try:
        decoded: dict = jwt.decode(token, key=_generate_key(sub, key), algorithms=["HS256"])
    except InvalidTokenError:
        return None

    now = datetime.now(tz=UTC).timestamp()
    if issued_at > now or expiry < now:
        return None

    # Clear out the metadata fields
    del decoded["iat"]
    del decoded["exp"]

    return decoded
