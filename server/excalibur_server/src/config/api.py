from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER


class RateLimit(BaseModel):
    capacity: int
    refill_rate: int

    @field_validator("capacity", "refill_rate")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value


class Logging(BaseModel):
    logs_dir: Path
    default_format: str
    access_format: str
    file_format: str
    no_log: list[str]

    @field_validator("logs_dir", mode="after")
    def edit_logs_dir(cls, value: Path) -> Path:
        return ROOT_FOLDER / value


class API(BaseModel):
    login_validity_time: int
    allow_origins: list[str]
    rate_limit: RateLimit
    logging: Logging

    @field_validator("login_validity_time")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
