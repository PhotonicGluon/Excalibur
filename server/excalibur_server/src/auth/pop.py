import re
from hmac import HMAC

POP_HEADER_PATTERN = r"^(?:(?<timestamp>[0-9]{1,10}) (?<nonce>[a-f0-9]{16}) (?<hmac>[a-f0-9]{64})|)$"


def parse_pop_header(pop_header: str) -> tuple[int, str, str]:
    """
    Parses the Proof of Possession (PoP) header.

    Assumes that the PoP header is valid.

    :param pop_header: the PoP header value
    :raises ValueError: if the PoP header is invalid
    :return: a tuple of the timestamp, nonce, and HMAC
    """

    match = re.match(POP_HEADER_PATTERN.replace(r"?<", r"?P<"), pop_header)

    timestamp = int(match.group("timestamp"))
    nonce = match.group("nonce")
    hmac = match.group("hmac")

    return timestamp, nonce, hmac


def generate_pop(master_key: bytes, method: str, path: str, timestamp: int, nonce: bytes) -> str:
    """
    Generates a valid Proof of Possession (PoP).

    :param master_key: the master key
    :param method: the HTTP method
    :param path: the path
    :param timestamp: the timestamp
    :param nonce: the nonce
    :return: the PoP
    """

    hmac_msg = f"{method} {path} {timestamp} {nonce}".encode("UTF-8")
    return HMAC(master_key, hmac_msg, "sha256").hexdigest()


def generate_pop_header(master_key: bytes, method: str, path: str, timestamp: int, nonce: bytes) -> str:
    """
    Generates a valid Proof of Possession (PoP) header.

    :param master_key: the master key
    :param method: the HTTP method
    :param path: the path
    :param timestamp: the timestamp
    :param nonce: the nonce
    :return: the PoP header
    """

    return f"{timestamp} {nonce} {generate_pop(master_key, method, path, timestamp, nonce)}"
