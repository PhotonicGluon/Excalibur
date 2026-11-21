from pydantic import BaseModel, field_validator


class Server(BaseModel):
    class RateLimit(BaseModel):
        unauthenticated_capacity: int
        unauthenticated_refill_rate: int
        authenticated_capacity: int
        authenticated_refill_rate: int

        @field_validator(
            "unauthenticated_capacity",
            "unauthenticated_refill_rate",
            "authenticated_capacity",
            "authenticated_refill_rate",
        )
        def validate_positive(cls, value: int) -> int:
            if value <= 0:
                raise ValueError("must be greater than 0")
            return value

    allow_origins: list[str]
    consecutive_transmission_delay: int
    rate_limit: RateLimit

    @field_validator("consecutive_transmission_delay")
    def validate_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("must be greater than 0")
        return value
