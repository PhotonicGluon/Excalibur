from typing import ClassVar, Literal

from pydantic import BaseModel, model_serializer

EXEF_VERSION = 2


class Header(BaseModel):
    """
    ExEF header.
    """

    size: ClassVar[int] = 28
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
        output += EXEF_VERSION.to_bytes(2, "big")
        output += self.keysize.to_bytes(2, "big")
        output += self.nonce  # Fixed at 12 bytes
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
