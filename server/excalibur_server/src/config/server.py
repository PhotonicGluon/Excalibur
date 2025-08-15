from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.security.srp.group import SRPGroup


class Server(BaseModel):
    vault_folder: Path
    database_file: Path
    srp_group: SRPGroup
    max_file_size: int
    file_process_chunk_size: int

    @field_validator("vault_folder", mode="after")
    def edit_vault_folder(cls, value: Path) -> Path:
        return ROOT_FOLDER / value

    @field_validator("srp_group", mode="before")
    def edit_srp_group(cls, value: str) -> SRPGroup:
        try:
            return SRPGroup[value.upper()]
        except KeyError:
            raise ValueError(f"Invalid SRP group '{value}'; choose from {list(SRPGroup.__members__.keys())}")

    @field_validator("max_file_size", "file_process_chunk_size")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
