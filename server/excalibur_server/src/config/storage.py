from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER


class Storage(BaseModel):
    class Database(BaseModel):
        file: Path

    vault_folder: Path
    max_upload_size: int
    max_spool_size: int
    write_chunk_size: int
    send_chunk_size: int
    database: Database

    @field_validator("vault_folder", mode="after")
    def edit_vault_folder(cls, value: Path) -> Path:
        return ROOT_FOLDER / value

    @field_validator("max_upload_size", "max_spool_size", "write_chunk_size", "send_chunk_size")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
