import hmac
from hashlib import sha256, sha512, shake_256
from typing import Literal


class HKDF:
    """
    HMAC-based Key Derivation Function (HKDF) implementation based on
    [RFC5869](https://datatracker.ietf.org/doc/html/rfc5869).
    """

    def __init__(self, algorithm: Literal["sha256", "sha512", "shake256"]):
        self.algorithm = algorithm
        if algorithm == "sha256":
            self.hash_function = sha256
        elif algorithm == "sha512":
            self.hash_function = sha512
        elif algorithm == "shake256":
            self.hash_function = shake_256

        self.digest_size = self.hash_function().digest_size

    # Helper methods
    def _hmac_hash(self, key: bytes, data: bytes) -> bytes:
        return hmac.new(key, data, self.hash_function).digest()

    # Main methods
    def extract(self, salt: bytes, ikm: bytes) -> bytes:
        """
        The `HKDF-Extract()` function described in section 2.2.

        :param salt: optional salt value
        :param ikm: input keying material
        :returns: a pseudorandom key
        """

        if len(salt) == 0:
            salt = bytes([0] * self.hash_function().digest_size)

        return self._hmac_hash(salt, ikm)

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
            t = self._hmac_hash(prk, t + info + bytes([i]))
            okm += t
        return okm[:length]
