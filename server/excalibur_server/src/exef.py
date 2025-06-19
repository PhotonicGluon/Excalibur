from typing import ClassVar, Literal, Generator, Iterator

from pydantic import BaseModel, field_validator, computed_field, model_serializer, ConfigDict

from Crypto.Cipher import AES, _mode_gcm
from Crypto.Random import get_random_bytes

EXEF_VERSION = 2


class ExEFHeader(BaseModel):
    """
    ExEF header.
    """

    header_size: ClassVar[int] = 28
    """Size of the ExEF header, in bytes"""

    keysize: Literal[128, 192, 256]
    """Size of the AES key, in bits"""
    nonce: bytes
    """12-byte nonce used for encryption"""
    ct_len: int
    """Length of the ciphertext, in bytes"""

    @model_serializer
    def serialize_as_bytes(self) -> bytes:
        """
        Generates the ExEF header.
        """

        output = b"ExEF"
        output += ExEF.version.to_bytes(2, "big")
        output += self.keysize.to_bytes(2, "big")
        output += self.nonce  # Fixed at 12 bytes
        output += self.ct_len.to_bytes(8, "big")
        return output

    @classmethod
    def from_serialized(cls, data: bytes) -> "ExEFHeader":
        """
        Parses the ExEF header.
        """

        if len(data) != cls.header_size:
            raise ValueError(f"header must be {cls.header_size} bytes")

        if data[:4] != b"ExEF":
            raise ValueError("data must start with ExEF")

        version = int.from_bytes(data[4:6], "big")
        if version != EXEF_VERSION:
            raise ValueError(f"version must be {EXEF_VERSION}")

        keysize = int.from_bytes(data[6:8], "big")

        nonce = data[8:20]
        ct_len = int.from_bytes(data[20:28], "big")

        return cls(
            keysize=keysize,
            nonce=nonce,
            ct_len=ct_len,
        )


class ExEFFooter(BaseModel):
    """
    ExEF footer.
    """

    footer_size: ClassVar[int] = 16
    """Size of the ExEF footer, in bytes"""

    tag: bytes
    """16-byte tag used for authentication"""

    @model_serializer
    def serialize_as_bytes(self) -> bytes:
        """
        Generates the ExEF footer.
        """

        return self.tag  # Fixed at 16 bytes

    @classmethod
    def from_serialized(cls, data: bytes) -> "ExEFFooter":
        """
        Parses the ExEF footer.
        """

        if len(data) != 16:
            raise ValueError("footer must be 16 bytes")

        return cls(tag=data)


class ExEF(BaseModel):
    """
    Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    header_size: ClassVar[int] = ExEFHeader.header_size
    """Size of the ExEF header, in bytes"""
    footer_size: ClassVar[int] = ExEFFooter.footer_size
    """Size of the ExEF footer, in bytes"""
    version: ClassVar[int] = EXEF_VERSION
    """ExEF version number"""

    key: bytes
    """Encryption key"""
    nonce: bytes
    """12-byte nonce used for encryption"""

    cipher: _mode_gcm.GcmMode
    """Cipher object used for encryption"""

    def __init__(self, key: bytes, nonce: bytes | None = None):
        if nonce is None:
            nonce = get_random_bytes(12)

        super().__init__(key=key, nonce=nonce, cipher=AES.new(key, AES.MODE_GCM, nonce=nonce))

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

    # Public methods
    def encrypt(self, data: bytes) -> bytes:
        """
        Encrypts the given data.

        :param data: The data to be encrypted, as bytes.
        :return: The ExEF bytes.
        """

        # Encrypt
        ciphertext = self.cipher.encrypt(data)
        tag = self.cipher.digest()

        # Form the output
        header = ExEFHeader(
            keysize=len(self.key) * 8,
            nonce=self.nonce,
            ct_len=len(ciphertext),
        )
        footer = ExEFFooter(tag=tag)
        return header.serialize_as_bytes() + ciphertext + footer.serialize_as_bytes()

    def encrypt_stream(self, pt_len: int, pt_stream: Iterator[bytes]) -> Generator[None, bytes, None]:
        """
        Encrypts the given stream of plaintext data.

        :param pt_len: plaintext length
        :param pt_stream: stream of plaintext bytes
        :yield: ExEF bytes
        """

        header = ExEFHeader(
            keysize=len(self.key) * 8,
            nonce=self.nonce,
            ct_len=pt_len,  # Ciphertext length is the same as plaintext length
        )
        yield header.serialize_as_bytes()
        for block in pt_stream:
            enc_block = self.cipher.encrypt(block)
            yield enc_block

        tag = self.cipher.digest()
        footer = ExEFFooter(tag=tag)
        yield footer.serialize_as_bytes()

    @classmethod
    def decrypt(cls, key: bytes, exef_data: bytes) -> bytes:
        """
        Decrypts the given ExEF data.

        :param key: key to use for decryption
        :param exef_data: data to decrypt
        :raises ValueError: if the keysize is not supported
        :raises ValueError: if the tag is invalid
        :return: plaintext
        """

        header = ExEFHeader.from_serialized(exef_data[: cls.header_size])
        footer = ExEFFooter.from_serialized(exef_data[-cls.footer_size :])
        if header.keysize != len(key) * 8:
            raise ValueError(f"keysize must be {header.keysize}")

        ciphertext = exef_data[cls.header_size : cls.header_size + header.ct_len]

        instance = cls(key=key, nonce=header.nonce)
        plaintext = instance.cipher.decrypt_and_verify(ciphertext, footer.tag)
        return plaintext

    @classmethod
    def decrypt_stream(cls, key: bytes, exef_stream: Iterator[bytes]) -> Generator[None, bytes, None]:
        """
        Decrypts the given ExEF stream.

        :param key: key to use for decryption
        :param exef_stream: stream of ExEF bytes
        :raises ValueError: if the keysize does not match the stream's key size
        :raises ValueError: if the tag is invalid
        :yield: plaintext bytes
        """

        # Receive header
        buffer = b""
        while len(buffer) < cls.header_size:
            buffer += next(exef_stream)

        header = ExEFHeader.from_serialized(buffer[: cls.header_size])
        if header.keysize != len(key) * 8:
            raise ValueError(f"keysize must be {len(key) * 8}")

        # Decrypt remaining part of the initial buffer
        instance = cls(key=key, nonce=header.nonce)
        buffer = buffer[cls.header_size :]
        yield instance.cipher.decrypt(buffer)

        # Decrypt the remaining ciphertext
        remaining_len = header.ct_len - len(buffer)
        last_part = b""
        while remaining_len > 0:
            buffer = next(exef_stream)
            if len(buffer) >= remaining_len:
                last_part = buffer[remaining_len:]
                yield instance.cipher.decrypt(buffer[:remaining_len])
                remaining_len = 0
            else:
                yield instance.cipher.decrypt(buffer)
                remaining_len -= len(buffer)

        # Get remainder of last part
        for chunk in exef_stream:
            last_part += chunk

        # Check tag
        footer = ExEFFooter.from_serialized(last_part)
        instance.cipher.verify(footer.tag)
