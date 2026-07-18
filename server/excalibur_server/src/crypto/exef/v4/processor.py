from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, computed_field, field_validator

from .crypto import Decryptor, Encryptor, KeyStrength
from .structures import (
    DEFAULT_EXPONENT,
    EXEF_VERSION,
    HEADER_SIZE,
    TAG_SIZE,
    Header,
    compute_encrypted_size,
)


class ExEFv4(BaseModel):
    """
    Processor for version 4 of the Excalibur Encryption Format (ExEF).
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    header_size: ClassVar[int] = HEADER_SIZE
    """Size of the ExEF header, in bytes"""
    tag_size: ClassVar[int] = TAG_SIZE
    """Size of each per-chunk authentication tag, in bytes"""
    version: ClassVar[int] = EXEF_VERSION
    """ExEF version number"""

    key: bytes
    """Encryption key"""

    encryptor: Encryptor
    """Encryptor object"""
    decryptor: Decryptor
    """Decryptor object"""

    def __init__(
        self,
        key: bytes,
        salt: bytes | None = None,
        strength: KeyStrength | None = None,
        exponent: int = DEFAULT_EXPONENT,
    ):
        """
        Initializes an ExEF v4 object.

        :param key: the key to use for encryption and decryption
        :param salt: the 32-byte salt to use for encryption. If not provided, a random salt is
            generated
        :param strength: the key strength to use for encryption, defaults to the length of `key` in
            bits
        :param exponent: the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        """

        if strength is None:
            strength = len(key) * 8

        encryptor = Encryptor(key, salt, strength, exponent)
        decryptor = Decryptor(key)
        super().__init__(
            key=key,
            encryptor=encryptor,
            decryptor=decryptor,
        )

    # Validators
    @field_validator("key")
    def validate_key(cls, value: bytes) -> bytes:
        if len(value) * 8 not in {128, 192, 256}:
            raise ValueError("keysize must be 128, 192, or 256")
        return value

    # Properties
    @computed_field
    @property
    def keysize(self) -> Literal[128, 192, 256]:
        """
        Size of the AES key in bits.
        """

        return len(self.key) * 8

    @property
    def alg(self) -> Literal["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]:
        """
        The encryption algorithm used in the ExEF format based on the key size.
        """
        return f"aes-{self.keysize}-gcm"

    # Convenience methods
    def encrypt(self, data: bytes) -> bytes:
        """
        Encrypts the given data.

        :param data: the data to encrypt
        :return: the encrypted data
        """

        return self.encryptor.encrypt(data)

    def decrypt(self, data: bytes) -> bytes:
        """
        Decrypts the given data.

        :param data: the encrypted data
        :raises ValueError: if the data is malformed
        :raises ValueError: if the data fails authentication
        :return: the decrypted data
        """

        return self.decryptor.decrypt(data)

    # Other methods
    @staticmethod
    def compute_encrypted_size(plaintext_len: int, exponent: int = DEFAULT_EXPONENT) -> int:
        """
        Computes the total ExEF v4 size for a plaintext of the given length.

        :param plaintext_len: the plaintext length, in bytes
        :param exponent: the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        :return: the total encrypted size, in bytes
        """

        return compute_encrypted_size(plaintext_len, exponent)

    @staticmethod
    def compute_overhead(plaintext_len: int, exponent: int = DEFAULT_EXPONENT) -> int:
        """
        Computes the ExEF v4 overhead (encrypted size minus plaintext size).

        :param plaintext_len: the plaintext length, in bytes
        :param exponent: the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        :return: the overhead, in bytes
        """

        return compute_encrypted_size(plaintext_len, exponent) - plaintext_len

    @classmethod
    def validate(cls, data: bytes) -> bool:
        """
        Checks if the given data begins with a valid ExEF v4 header.

        :param data: the data to check
        :return: whether the data has a valid ExEF v4 header
        """

        try:
            Header.from_serialized(data[:HEADER_SIZE])
            return True
        except ValueError:
            return False
