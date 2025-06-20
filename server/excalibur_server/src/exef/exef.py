from typing import ClassVar, Literal

from Crypto.Random import get_random_bytes
from pydantic import BaseModel, ConfigDict, computed_field, field_validator

from .crypto import Decryptor, Encryptor
from .structures import EXEF_VERSION, Footer, Header


class ExEF(BaseModel):
    """
    Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
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

    def __init__(self, key: bytes, nonce: bytes | None = None):
        """
        Initializes an ExEF object.

        :param key: The key to use for encryption and decryption.
        :param nonce: The 12-byte nonce to use for encryption. If not provided, a random nonce is
            generated.
        """

        if nonce is None:
            nonce = get_random_bytes(12)

        super().__init__(key=key, nonce=nonce, encryptor=Encryptor(key, nonce), decryptor=Decryptor(key))

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
    def validate_key(cls, value: bytes) -> int:
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

        :param data: The data to encrypt
        :return: The encrypted data
        """

        return self.encryptor.encrypt(data)

    def decrypt(self, data: bytes) -> bytes:
        """
        Decrypts the given data.

        :param data: The encrypted data
        :return: The decrypted data
        :raises ValueError: If the header or footer have not been set
        :raises ValueError: If the footer is not valid (e.g., wrong tag)
        """

        return self.decryptor.decrypt(data)
