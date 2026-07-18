from typing import ClassVar, Literal

from Crypto.Random import get_random_bytes
from pydantic import BaseModel, ConfigDict, computed_field, field_validator

from .crypto import Decryptor, Encryptor, KeyStrength
from .structures import EXEF_VERSION, Footer, Header


class ExEFv3(BaseModel):
    """
    Processor for version 3 of the Excalibur Encryption Format (ExEF).
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    header_size: ClassVar[int] = Header.size
    """Size of the ExEF header, in bytes"""
    footer_size: ClassVar[int] = Footer.size
    """Size of the ExEF footer, in bytes"""
    additional_size: ClassVar[int] = header_size + footer_size
    """Size of the ExEF additional data, in bytes"""
    version: ClassVar[int] = EXEF_VERSION
    """ExEF version number"""

    key: bytes
    """Encryption key"""
    nonce: bytes
    """12-byte nonce used for encryption"""

    encryptor: Encryptor
    """Encryptor object"""
    decryptor: Decryptor
    """Decryptor object"""

    def __init__(self, key: bytes, nonce: bytes | None = None, strength: KeyStrength | None = None):
        """
        Initializes an ExEF v3 object.

        :param key: the key to use for encryption and decryption
        :param nonce: the 12-byte nonce to use for encryption. If not provided, a random nonce is
            generated
        :param strength: the key strength to use for encryption, defaults to the length of `key` in
            bits
        """

        if strength is None:
            strength = len(key) * 8

        if nonce is None:
            nonce = get_random_bytes(12)

        encryptor = Encryptor(key, nonce, strength)
        decryptor = Decryptor(key)
        super().__init__(key=key, nonce=nonce, encryptor=encryptor, decryptor=decryptor)

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

    # Validators
    @field_validator("key")
    def validate_key(cls, value: bytes) -> bytes:
        if len(value) * 8 not in {128, 192, 256}:
            raise ValueError("keysize must be 128, 192, or 256")
        return value

    @field_validator("nonce")
    def validate_nonce(cls, value: bytes) -> bytes:
        if len(value) != 12:
            raise ValueError("nonce must be 12 bytes")
        return value

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
        :return: the decrypted data
        :raises ValueError: if the header or footer have not been set
        :raises ValueError: if the footer is not valid (e.g., wrong tag)
        """

        return self.decryptor.decrypt(data)

    # Other methods
    @classmethod
    def validate(cls, data: bytes) -> bool:
        """
        Checks if the given data is valid ExEF v3 data.

        :param data: the data to check
        :return: whether the data is valid ExEF v3 data
        """

        try:
            Header.from_serialized(data[: Header.size])
            Footer.from_serialized(data[-Footer.size :])
            return True
        except ValueError:
            return False
