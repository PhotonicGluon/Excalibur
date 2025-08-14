from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER


class Server(BaseModel):
    vault_folder: Path
    database_file: Path
    max_file_size: int
    file_process_chunk_size: int

    @field_validator("max_file_size", "file_process_chunk_size")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value

    @field_validator("vault_folder", mode="after")
    def edit_vault_folder(cls, value: Path) -> Path:
        return ROOT_FOLDER / value
