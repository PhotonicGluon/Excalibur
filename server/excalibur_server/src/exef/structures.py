from typing import ClassVar, Literal

from pydantic import BaseModel, model_serializer

EXEF_VERSION = 3


class Header(BaseModel):
    """
    ExEF header.
    """

    size: ClassVar[int] = 40
    """Size of the ExEF header, in bytes"""

    cipher_id: Literal[1, 2, 3]
    """ID of the cipher suite used for encryption"""
    nonce: bytes
    """12-byte nonce used for encryption"""
    header_mac: bytes
    """14-byte tag used for checking the user's decryption key"""
    ct_len: int
    """Length of the ciphertext, in bytes"""

    @model_serializer
    def serialize_as_bytes(self) -> bytes:
        """
        Generates the ExEF header.
        """

        output = b"ExEF"
        output += EXEF_VERSION.to_bytes(1, "big")
        output += self.cipher_id.to_bytes(1, "big")
        output += self.nonce  # Fixed at 12 bytes
        output += self.header_mac  # Fixed at 14 bytes
        output += self.ct_len.to_bytes(8, "big")
        return output

    @classmethod
    def from_serialized(cls, data: bytes) -> "Header":
        """
        Parses the ExEF header.
        """

        if len(data) != cls.size:
            raise ValueError(f"header must be {cls.size} bytes")

        if data[:4] != b"ExEF":
            raise ValueError("data must start with 'ExEF'")

        version = int.from_bytes(data[4:5], "big")
        if version != EXEF_VERSION:
            raise ValueError(f"version must be {EXEF_VERSION}")

        cipher_id = int.from_bytes(data[5:6], "big")

        nonce = data[6:18]
        header_mac = data[18:32]
        ct_len = int.from_bytes(data[32:40], "big")

        return cls(
            cipher_id=cipher_id,
            nonce=nonce,
            header_mac=header_mac,
            ct_len=ct_len,
        )


class Footer(BaseModel):
    """
    ExEF footer.
    """

    size: ClassVar[int] = 16
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
    def from_serialized(cls, data: bytes) -> "Footer":
        """
        Parses the ExEF footer.
        """

        if len(data) != 16:
            raise ValueError("footer must be 16 bytes")

        return cls(tag=data)
