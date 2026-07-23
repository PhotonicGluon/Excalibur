from typing import Literal

from excalibur_server.src.crypto.exef.base import BaseDecryptor, BaseEncryptor, KeyStrength
from excalibur_server.src.crypto.exef.v4.structures import DEFAULT_EXPONENT

from .v3 import ExEFv3
from .v4 import ExEFv4

DEFAULT_VERSION = 4
"""The ExEF version produced when encrypting, unless overridden."""

SUPPORTED_VERSIONS = (3, 4)

# The version byte lives at offset 4, so we need at least 5 bytes to identify a stream.
VERSION_OFFSET = 4
MIN_IDENTIFY_BYTES = VERSION_OFFSET + 1

_PROCESSORS: dict[int, type] = {3: ExEFv3, 4: ExEFv4}


def identify_version(data: bytes) -> Literal[3, 4]:
    """
    Identifies the ExEF version of a data stream from its header.

    Only the magic bytes and version byte are inspected, so this works on a truncated stream as long
    as a minimal amount of data is present for identification.

    :param data: the (start of the) ExEF data
    :raises ValueError: if the magic is wrong
    :raises ValueError: if the stream is too short
    :raises ValueError: if the version is unsupported
    :return: the ExEF version number (3 or 4)
    """

    if len(data) < MIN_IDENTIFY_BYTES:
        raise ValueError("data too short to identify ExEF version")
    if data[:4] != b"ExEF":
        raise ValueError("data must start with 'ExEF'")

    version = data[VERSION_OFFSET]
    if version not in SUPPORTED_VERSIONS:
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
        nonce: bytes | None = None,
        strength: KeyStrength | None = None,
        version: int = DEFAULT_VERSION,
        salt: bytes | None = None,
        exponent: int = DEFAULT_EXPONENT,
    ):
        """
        Constructor.

        :param key: the key to use for encryption and decryption
        :param nonce: (ExEF v3 only) the 12-byte nonce to use for encryption
        :param strength: the key strength to use for encryption, defaults to the length of `key` in bits
        :param version: the ExEF version to produce when encrypting, defaults to the `DEFAULT_VERSION`
        :param salt: (ExEF v4 only) the 32-byte salt to use for encryption
        :param exponent: (ExEF v4 only) the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        :raises ValueError: if the version is not supported
        """

        if version not in SUPPORTED_VERSIONS:
            raise ValueError(f"unsupported ExEF version: {version}")

        self.key = key
        self.version = version

        # Build the version-specific processor used for encryption
        self._processor: ExEFv3 | ExEFv4
        if version == 3:
            self._processor = ExEFv3(key, nonce=nonce, strength=strength)
        else:
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

        :param data: the encrypted data (either version 3 or version 4)
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
        cls, plaintext_len: int, version: int = DEFAULT_VERSION, exponent: int | None = None
    ) -> int:
        """
        Computes the total encrypted size for a plaintext of the given length.

        :param plaintext_len: the plaintext length, in bytes
        :param version: the ExEF version, defaults to the `DEFAULT_VERSION`
        :param exponent: (ExEF v4 only) the chunk size exponent
        :return: the total encrypted size, in bytes
        """

        if version == 3:
            return plaintext_len + ExEFv3.additional_size
        if version == 4:
            if exponent is None:
                return ExEFv4.compute_encrypted_size(plaintext_len)
            return ExEFv4.compute_encrypted_size(plaintext_len, exponent)
        raise ValueError(f"unsupported ExEF version: {version}")
