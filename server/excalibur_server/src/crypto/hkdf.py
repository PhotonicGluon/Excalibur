import hmac
from hashlib import sha256, sha512
from typing import Literal


class HKDF:
    """
    HMAC-based Key Derivation Function (HKDF) implementation based on
    [RFC5869](https://datatracker.ietf.org/doc/html/rfc5869).
    """

    def __init__(self, algorithm: Literal["sha256", "sha512"]):
        self.algorithm = algorithm
        if algorithm == "sha256":
            self.hash_function = sha256
        elif algorithm == "sha512":
            self.hash_function = sha512

        self.digest_size = self.hash_function().digest_size

    def hmac_hash(self, key: bytes, msg: bytes) -> bytes:
        """
        HKDF HMAC-Hash function as defined in RFC5869.

        :param key: the key to use for the HMAC
        :param msg: the message to hash
        :return: the hashed message
        """

        return hmac.new(key, msg, self.hash_function).digest()

    def extract(self, salt: bytes, ikm: bytes) -> bytes:
        """
        The `HKDF-Extract()` function described in section 2.2.

        :param salt: optional salt value
        :param ikm: input keying material
        :returns: a pseudorandom key
        """

        if len(salt) == 0:
            salt = b"\x00" * self.hash_function().digest_size

        return self.hmac_hash(salt, ikm)

    def expand(self, prk: bytes, info: bytes, length: int) -> bytes:
        """
        The `HKDF-Expand()` function described in section 2.3.

        :param prk: a pseudorandom key of at least digest size bytes
        :param info: optional context and application specific information
        :param length: length of output keying material in bytes
        :returns: output keying material of `length` bytes
        """

        t = b""
        okm = b""
        i = 0
        while len(okm) < length:
            i += 1
            t = self.hmac_hash(prk, t + info + bytes([i]))
            okm += t
        return okm[:length]
