from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError

from excalibur_server.src.security.consts import KEY


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
