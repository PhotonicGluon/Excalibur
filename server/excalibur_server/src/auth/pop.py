import re
from base64 import b64decode, b64encode
from hmac import HMAC

POP_HEADER_PATTERN = r"^(?:(?<timestamp>[0-9]{1,10}) (?<nonce>[A-Za-z0-9+\/]{22}==) (?<hmac>[A-Za-z0-9+\/]{43}=)|)$"


def generate_pop(master_key: bytes, method: str, path: str, timestamp: int, nonce: bytes) -> bytes:
    """
    Generates a valid Proof of Possession (PoP).

    :param master_key: the master key
    :param method: the HTTP method
    :param path: the path
    :param timestamp: the timestamp
    :param nonce: the nonce
    :return: the PoP
    """

    hmac_msg = f"{method} {path} {timestamp} ".encode("UTF-8") + nonce
    return HMAC(master_key, hmac_msg, "sha256").digest()


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

    pop = generate_pop(master_key, method, path, timestamp, nonce)
    return f"{timestamp} {b64encode(nonce).decode('UTF-8')} {b64encode(pop).decode('UTF-8')}"


def parse_pop_header(pop_header: str) -> tuple[int, bytes, bytes]:
    """
    Parses the Proof of Possession (PoP) header.

    Assumes that the PoP header is valid.

    :param pop_header: the PoP header value
    :raises ValueError: if the PoP header is invalid
    :return: a tuple of the timestamp, nonce, and HMAC
    """

    match = re.match(POP_HEADER_PATTERN.replace(r"?<", r"?P<"), pop_header)

    timestamp = int(match.group("timestamp"))
    nonce = b64decode(match.group("nonce"))
    hmac = b64decode(match.group("hmac"))

    return timestamp, nonce, hmac
