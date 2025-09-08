import re
from hmac import HMAC

HMAC_HEADER_PATTERN = r"^(?:(?<timestamp>[0-9]{1,10}) (?<nonce>[a-f0-9]{16}) (?<hmac>[a-f0-9]{64})|)$"


def parse_hmac_header(hmac_header: str) -> tuple[int, str, str]:
    """
    Parses the HMAC header.

    Assumes that the HMAC header is valid.

    :param hmac_header: the HMAC header value
    :raises ValueError: if the HMAC header is invalid
    :return: a tuple of the timestamp, nonce, and HMAC
    """

    match = re.match(HMAC_HEADER_PATTERN.replace(r"?<", r"?P<"), hmac_header)

    timestamp = int(match.group("timestamp"))
    nonce = match.group("nonce")
    hmac = match.group("hmac")

    return timestamp, nonce, hmac


def generate_hmac(master_key: bytes, method: str, path: str, timestamp: int, nonce: bytes) -> str:
    """
    Generates a valid HMAC.

    :param master_key: the master key
    :param method: the HTTP method
    :param path: the path
    :param timestamp: the timestamp
    :param nonce: the nonce
    :return: the HMAC
    """

    hmac_msg = f"{method} {path} {timestamp} {nonce}".encode("UTF-8")
    return HMAC(master_key, hmac_msg, "sha256").hexdigest()


def generate_hmac_header(master_key: bytes, method: str, path: str, timestamp: int, nonce: bytes) -> str:
    """
    Generates a valid HMAC header.

    :param master_key: the master key
    :param method: the HTTP method
    :param path: the path
    :param timestamp: the timestamp
    :param nonce: the nonce
    :return: the HMAC header
    """

    return f"{timestamp} {nonce} {generate_hmac(master_key, method, path, timestamp, nonce)}"
