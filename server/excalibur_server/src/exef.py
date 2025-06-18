from typing import ClassVar, Literal

from pydantic import BaseModel, field_validator, model_serializer


class ExEF(BaseModel):
    """
    Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
    """

    header_size: ClassVar[int] = 28
    footer_size: ClassVar[int] = 16
    version: ClassVar[int] = 2

    keysize: Literal[128, 192, 256]
    nonce: bytes
    ciphertext: bytes
    tag: bytes

    # Properties
    @property
    def alg(self) -> Literal["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]:
        """
        The encryption algorithm used in the ExEF format based on the key size.
        """
        return f"aes-{self.keysize}-gcm"

    # Validators
    @field_validator("keysize")
    def validate_keysize(cls, value: int) -> int:
        if value not in {128, 192, 256}:
            raise ValueError("keysize must be 128, 192, or 256")
        return value

    @field_validator("nonce")
    def validate_nonce(cls, value: bytes) -> bytes:
        if len(value) != 12:
            raise ValueError("nonce must be 12 bytes")
        return value

    @field_validator("ciphertext")
    def validate_ciphertext(cls, value: bytes) -> bytes:
        if len(value) == 0:
            raise ValueError("ciphertext cannot be empty")
        return value

    @field_validator("tag")
    def validate_tag(cls, value: bytes) -> bytes:
        if len(value) != 16:
            raise ValueError("tag must be 16 bytes")
        return value

    # Serializers
    @model_serializer
    def serialize_exef(self) -> bytes:
        output = b"ExEF"
        output += ExEF.version.to_bytes(2, "big")
        output += self.keysize.to_bytes(2, "big")
        output += self.nonce  # Fixed at 12 bytes
        output += len(self.ciphertext).to_bytes(8, "big")
        output += self.ciphertext
        output += self.tag  # Fixed at 16 bytes
        return output

    @classmethod
    def from_serialized(cls, data: bytes) -> "ExEF":
        if data[:4] != b"ExEF":
            raise ValueError("data must start with ExEF")

        version = int.from_bytes(data[4:6], "big")
        if version != ExEF.version:
            raise ValueError(f"version must be {ExEF.version}")

        keysize = int.from_bytes(data[6:8], "big")
        nonce = data[8:20]
        ct_len = int.from_bytes(data[20:28], "big")
        ct = data[ExEF.header_size : ExEF.header_size + ct_len]

        tag = data[ExEF.header_size + ct_len : ExEF.header_size + ct_len + 16]

        return cls(
            version=version,
            keysize=keysize,
            nonce=nonce,
            ciphertext=ct,
            tag=tag,
        )
