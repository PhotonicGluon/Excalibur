from base64 import b64decode
from pathlib import Path

from pydantic import BaseModel, ConfigDict, field_validator

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.auth.opaque.ristretto255 import Ristretto255
from excalibur_server.src.auth.srp.group import SRPGroup
from excalibur_server.src.exef.crypto import KeyStrength


class Security(BaseModel):
    class SRP(BaseModel):
        group: SRPGroup

        @field_validator("group", mode="before")
        def edit_srp_group(cls, value: str) -> SRPGroup:
            try:
                return SRPGroup[value.upper()]
            except KeyError:
                raise ValueError(f"Invalid SRP group '{value}'; choose from {list(SRPGroup.__members__.keys())}")

    class OPAQUE(BaseModel):
        model_config = ConfigDict(arbitrary_types_allowed=True)

        oprf_seed: bytes
        public_key: Ristretto255
        private_key: int

        @field_validator("oprf_seed", mode="before")
        def edit_oprf_seed(cls, value: str) -> bytes:
            return bytes.fromhex(value)

        @field_validator("public_key", mode="before")
        def edit_public_key(cls, value: str) -> bytes:
            raw = b64decode(value)
            return Ristretto255.from_bytes(raw)

        @field_validator("private_key", mode="before")
        def edit_private_key(cls, value: str) -> bytes:
            raw = b64decode(value)
            return int.from_bytes(raw, byteorder="little")

    class E2EE(BaseModel):
        comm_cache_size: int
        comm_cache_file: Path

        @field_validator("comm_cache_size")
        def validate_positive(cls, value: int) -> int:
            if value <= 0:
                raise ValueError("must be greater than 0")
            return value

        @field_validator("comm_cache_file", mode="after")
        def edit_file(cls, value: Path) -> Path:
            return ROOT_FOLDER / value

    class PoP(BaseModel):
        nonce_cache_size: int
        timestamp_validity: int

        @field_validator("nonce_cache_size", "timestamp_validity")
        def validate_positive(cls, value: int) -> int:
            if value <= 0:
                raise ValueError("must be greater than 0")
            return value

    session_duration: int
    account_creation_key: bytes
    key_strength: KeyStrength
    srp: SRP
    opaque: OPAQUE
    e2ee: E2EE
    pop: PoP

    @field_validator("session_duration")
    def validate_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("must be greater than 0")
        return value

    @field_validator("account_creation_key", mode="before")
    def validate_account_creation_key(cls, value: str) -> bytes:
        try:
            value = bytes.fromhex(value)
        except ValueError:
            raise ValueError("must be a valid hex string")
        if len(value) != 32:
            raise ValueError("must be 32 bytes long")
        return value
