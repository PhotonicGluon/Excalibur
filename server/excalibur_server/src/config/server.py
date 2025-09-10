from pydantic import BaseModel, field_validator


class Server(BaseModel):
    class RateLimit(BaseModel):
        capacity: int
        refill_rate: int

        @field_validator("capacity", "refill_rate")
        def validate_positive(cls, value: int) -> int:
            if value < 0:
                raise ValueError("must be greater than 0")
            return value

    allow_origins: list[str]
    rate_limit: RateLimit
