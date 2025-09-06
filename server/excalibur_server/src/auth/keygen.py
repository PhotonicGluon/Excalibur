import hashlib
import unicodedata
from typing import TypedDict

from Crypto.Protocol.KDF import HKDF
from Crypto.Hash import SHA256

DIGEST_ALGORITHM = "sha256"
KEY_LENGTH = 32  # In bytes
NUM_ITER = 650_000


class KeygenAdditionalInfo(TypedDict):
    username: str


def normalize_password(password: str) -> bytes:
    """
    Normalizes a password by:
    1. Removing leading/trailing whitespace
    2. Applying Unicode NFKD normalization
    3. Converting to UTF-8 byte array

    :param password: The input password string
    :returns: UTF-8 byte array of the normalized password
    """

    trimmed = password.strip()
    normalized = unicodedata.normalize("NFKD", trimmed)
    return normalized.encode("utf-8")


def slow_hash(password_buf: bytes, salt: bytes) -> bytes:
    """
    Performs a slow hash using PBKDF2.

    :param password_buf: The password buffer to be hashed
    :param salt: The salt to be used
    :returns: The hashed password
    """

    return hashlib.pbkdf2_hmac(DIGEST_ALGORITHM, password_buf, salt, NUM_ITER, dklen=KEY_LENGTH)


def fast_hash(additional_info: KeygenAdditionalInfo, salt: bytes) -> bytes:
    """
    Performs a fast hash using HKDF.

    :param additional_info: The additional information to be used
    :returns: The hashed password
    """

    return HKDF(f"{{\"username\":\"{additional_info['username']}\"}}".encode("UTF-8"), KEY_LENGTH, salt, SHA256)


def generate_key(password: str, additional_info: KeygenAdditionalInfo, salt: bytes) -> bytes:
    """
    Generates a cryptographic key using PBKDF2 and HKDF methods.

    :param password: The password to be used
    :param salt: A buffer representing the salt value
    :returns: A buffer containing the generated key
    """

    password_buf = normalize_password(password)
    i_key_1 = slow_hash(password_buf, salt)
    i_key_2 = fast_hash(additional_info, salt)
    return b"".join([bytes([i_key_1[i] ^ i_key_2[i]]) for i in range(KEY_LENGTH)])
