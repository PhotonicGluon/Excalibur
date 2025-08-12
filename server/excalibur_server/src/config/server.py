from pydantic import BaseModel, field_validator


class Server(BaseModel):
    max_file_size: int
    file_process_chunk_size: int

    @field_validator("max_file_size", "file_process_chunk_size")
    def validate_positive(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than 0")
        return value
