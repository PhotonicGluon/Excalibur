from typing import Literal

from excalibur_server.src.crypto.exef.base import BaseDecryptor, BaseEncryptor, KeyStrength
from excalibur_server.src.crypto.exef.v4.structures import DEFAULT_EXPONENT

from .v4 import ExEFv4

CURRENT_VERSION = 4
"""The ExEF version produced when encrypting."""

# The version byte lives at offset 4, so we need at least 5 bytes to identify a stream.
VERSION_OFFSET = 4
MIN_IDENTIFY_BYTES = VERSION_OFFSET + 1

_PROCESSORS: dict[int, type] = {4: ExEFv4}


def identify_version(data: bytes) -> Literal[CURRENT_VERSION]:
    """
    Identifies the ExEF version of a data stream from its header.

    Only the magic bytes and version byte are inspected, so this works on a truncated stream as long
    as a minimal amount of data is present for identification.

    :param data: the (start of the) ExEF data
    :raises ValueError: if the magic is wrong
    :raises ValueError: if the stream is too short
    :raises ValueError: if the version is unsupported
    :return: the current ExEF version number
    """

    if len(data) < MIN_IDENTIFY_BYTES:
        raise ValueError("data too short to identify ExEF version")
    if data[:4] != b"ExEF":
        raise ValueError("data must start with 'ExEF'")

    version = data[VERSION_OFFSET]
    if version != CURRENT_VERSION:
        raise ValueError(f"unsupported ExEF version: {version}")
    return version


class _AutoDecryptor(BaseDecryptor):
    """
    A streaming decryptor that identifies the ExEF version from the incoming stream and delegates to
    the appropriate version-specific decryptor.
    """

    def __init__(self, key: bytes):
        """
        Constructor.

        :param key: the decryption key
        """

        super().__init__(key)

        self._buffer = b""
        self._delegate = None
        self._error: Exception | None = None

    # Properties
    @property
    def is_queue_clear(self) -> bool:
        return self._delegate is None or self._delegate.is_queue_clear

    @property
    def fully_processed(self) -> bool:
        return self._delegate is not None and self._delegate.fully_processed

    # Helper methods
    def _ensure_delegate(self):
        """
        Ensure that the delegate decryptor is initialized, once enough bytes have arrived.
        """

        if self._delegate is not None or self._error is not None:
            return
        if len(self._buffer) < MIN_IDENTIFY_BYTES:
            return

        try:
            version = identify_version(self._buffer)
        except ValueError as e:
            self._error = e
            return

        self._delegate = _PROCESSORS[version](self.key).decryptor
        buffered, self._buffer = self._buffer, b""
        self._delegate.update(buffered)

    # Public methods
    def update(self, data: bytes):
        if self._delegate is not None:
            self._delegate.update(data)
            return

        self._buffer += data
        self._ensure_delegate()

    def get(self) -> bytes:
        if self._delegate is None:
            return b""

        return self._delegate.get()

    def verify(self):
        if self._error is not None:
            raise self._error
        if self._delegate is None:
            raise ValueError("incomplete ExEF data")

        self._delegate.verify()

    def decrypt(self, exef_data: bytes) -> bytes:
        self.update(exef_data)
        output = self._drain()
        self.verify()
        return output


class ExEF:
    """
    Excalibur Encryption Format (ExEF) processor.

    Encryption produces the version given by the `version` option (defaulting to the
    `DEFAULT_VERSION`), while decryption auto-detects the version of whatever data it is fed.
    """

    def __init__(
        self,
        key: bytes,
        strength: KeyStrength | None = None,
        version: int = CURRENT_VERSION,
        salt: bytes | None = None,
        exponent: int = DEFAULT_EXPONENT,
    ):
        """
        Constructor.

        :param key: the key to use for encryption and decryption
        :param strength: the key strength to use for encryption, defaults to the length of `key` in
            bits
        :param version: the ExEF version to produce when encrypting. If provided, must be the
            `CURRENT_VERSION`
        :param salt: the 32-byte salt to use for encryption
        :param exponent: the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        :raises ValueError: if the version is not supported
        """

        if version != CURRENT_VERSION:
            raise ValueError("unsupported ExEF version")

        self.key = key

        # Build the version-specific processor used for encryption
        self._processor = ExEFv4(key, salt=salt, strength=strength, exponent=exponent)

        # The decryptor auto-detects the version of whatever stream it is fed
        self._decryptor = _AutoDecryptor(key)

    # Properties
    @property
    def keysize(self) -> Literal[128, 192, 256]:
        """Size of the AES key in bits."""
        return len(self.key) * 8

    @property
    def alg(self) -> Literal["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]:
        """The encryption algorithm used, based on the key size."""
        return f"aes-{self.keysize}-gcm"

    @property
    def encryptor(self) -> BaseEncryptor:
        """The version-specific encryptor object used for encryption."""
        return self._processor.encryptor

    @property
    def decryptor(self) -> BaseDecryptor:
        """The version-detecting decryptor object used for decryption."""
        return self._decryptor

    # Convenience methods
    def encrypt(self, data: bytes) -> bytes:
        """
        Encrypts the given data as the configured version.

        :param data: the data to encrypt
        :return: the encrypted data
        """

        return self._processor.encrypt(data)

    def decrypt(self, data: bytes) -> bytes:
        """
        Decrypts the given ExEF data, auto-detecting its version.

        :param data: the encrypted data
        :return: the decrypted data
        :raises ValueError: if the data is malformed or fails authentication
        """

        version = identify_version(data)
        return _PROCESSORS[version](self.key).decrypt(data)

    # Other methods
    @classmethod
    def validate(cls, data: bytes) -> bool:
        """
        Checks if the given data is valid ExEF data of any supported version.

        :param data: the data to check
        :return: whether the data is valid ExEF data
        """

        try:
            version = identify_version(data)
        except ValueError:
            return False
        return _PROCESSORS[version].validate(data)

    @classmethod
    def compute_encrypted_size(
        cls, plaintext_len: int, version: int = CURRENT_VERSION, exponent: int | None = None
    ) -> int:
        """
        Computes the total encrypted size for a plaintext of the given length.

        :param plaintext_len: the plaintext length, in bytes
        :param version: the ExEF version. If provided, must be the `CURRENT_VERSION`
        :param exponent: the chunk size exponent
        :return: the total encrypted size, in bytes
        """

        if version != CURRENT_VERSION:
            raise ValueError(f"unsupported ExEF version: {version}")

        if exponent is None:
            return ExEFv4.compute_encrypted_size(plaintext_len)
        return ExEFv4.compute_encrypted_size(plaintext_len, exponent)
