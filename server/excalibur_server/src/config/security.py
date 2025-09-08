from pydantic import BaseModel, field_validator

from excalibur_server.src.auth.srp.group import SRPGroup


class Security(BaseModel):
    srp_group: SRPGroup
    login_validity_time: int

    @field_validator("srp_group", mode="before")
    def edit_srp_group(cls, value: str) -> SRPGroup:
        try:
            return SRPGroup[value.upper()]
        except KeyError:
            raise ValueError(f"Invalid SRP group '{value}'; choose from {list(SRPGroup.__members__.keys())}")

    @field_validator("login_validity_time")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
