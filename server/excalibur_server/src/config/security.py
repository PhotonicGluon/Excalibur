from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER
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
