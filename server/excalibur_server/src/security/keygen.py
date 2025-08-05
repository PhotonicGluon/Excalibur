import hashlib
import unicodedata

DIGEST_ALGORITHM = "sha256"
KEY_LENGTH = 32  # In bytes
NUM_ITER = 650_000


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


def generate_key(password: str, salt: bytes) -> bytes:
    """
    Generates a cryptographic key using PBKDF2.

    :param password: The password to be used
    :param salt: A buffer representing the salt value
    :returns: A buffer containing the generated key
    """

    password_buf = normalize_password(password)
    return slow_hash(password_buf, salt)
