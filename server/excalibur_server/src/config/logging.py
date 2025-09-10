from pathlib import Path

from pydantic import BaseModel, field_validator

from excalibur_server.consts import ROOT_FOLDER


class Logging(BaseModel):
    class Format(BaseModel):
        default: str
        access: str
        file: str

    directory: Path
    no_log_endpoints: list[str]
    format: Format

    @field_validator("directory", mode="after")
    def edit_directory(cls, value: Path) -> Path:
        return ROOT_FOLDER / value
