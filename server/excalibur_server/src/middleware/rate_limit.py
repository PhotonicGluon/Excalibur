from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from excalibur_server.src.token_bucket import TokenBucket


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, capacity: int, refill_rate: float) -> None:
        """
        Constructor

        :param app: The ASGI app
        :param capacity: The capacity of the token bucket
        :param refill_rate: The refill rate of the token bucket
        """

        super().__init__(app)

        self._bucket = TokenBucket(capacity=capacity, refill_rate=refill_rate)

    async def dispatch(self, request: Request, call_next):
        client_id = request.client.host  # Use IP address as the client identifier

        if not self._bucket.consume(client_id):
            return JSONResponse(status_code=429, content={"message": "Too Many Requests"})

        response = await call_next(request)
        return response
