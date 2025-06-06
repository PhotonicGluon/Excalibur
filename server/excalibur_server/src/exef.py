from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_serializer


class ExEF(BaseModel):
    """
    Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
    """

    version: Annotated[int, Field(frozen=True)] = 1
    keysize: Literal[128, 192, 256]
    nonce: bytes
    tag: bytes
    ciphertext: bytes

    # Validators
    @field_validator("keysize")
    def validate_keysize(cls, value: int) -> int:
        if value not in {128, 192, 256}:
            raise ValueError("keysize must be 128, 192, or 256")
        return value

    @field_validator("nonce")
    def validate_nonce(cls, value: bytes) -> bytes:
        if len(value) not in {16, 24, 32}:
            raise ValueError("nonce must be 16, 24, or 32 bytes")
        return value

    @field_validator("tag")
    def validate_tag(cls, value: bytes) -> bytes:
        if len(value) != 16:
            raise ValueError("tag must be 16 bytes")
        return value

    @field_validator("ciphertext")
    def validate_ciphertext(cls, value: bytes) -> bytes:
        if len(value) == 0:
            raise ValueError("ciphertext cannot be empty")
        return value

    # Serializers
    @model_serializer
    def serialize_exef(self) -> bytes:
        output = b"ExEF"
        output += self.version.to_bytes(2, "big")
        output += self.keysize.to_bytes(2, "big")
        output += self.nonce.ljust(32, b"\x00")
        output += self.tag  # Fixed at 16 bytes
        output += len(self.ciphertext).to_bytes(8, "big")
        output += self.ciphertext
        return output

    @classmethod
    def from_serialized(cls, data: bytes) -> "ExEF":
        if len(data) <= 64:
            raise ValueError("data must be at least 64 bytes")

        if data[:4] != b"ExEF":
            raise ValueError("data must start with ExEF")

        ct = data[64:]
        ct_len = int.from_bytes(data[56:64], "big")
        if len(ct) != ct_len:
            raise ValueError("ciphertext length does not match header")

        return cls(
            version=int.from_bytes(data[4:6], "big"),
            keysize=int.from_bytes(data[6:8], "big"),
            nonce=data[8:40].rstrip(b"\x00"),
            tag=data[40:56],
            ciphertext=ct,
        )
