from pydantic import BaseModel, field_validator

from excalibur_server.src.auth.srp.group import SRPGroup


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

        @field_validator("comm_cache_size")
        def validate_positive(cls, value: int) -> int:
            if value < 0:
                raise ValueError("must be greater than 0")
            return value

    class PoP(BaseModel):
        nonce_cache_size: int
        timestamp_validity: int

        @field_validator("nonce_cache_size", "timestamp_validity")
        def validate_positive(cls, value: int) -> int:
            if value < 0:
                raise ValueError("must be greater than 0")
            return value

    session_duration: int
    srp: SRP
    e2ee: E2EE
    pop: PoP

    @field_validator("session_duration")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
