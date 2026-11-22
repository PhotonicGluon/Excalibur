from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from excalibur_server.src.token_bucket import TokenBucket


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that limits the rate of requests.
    """

    def __init__(
        self,
        app: ASGIApp,
        unauthenticated_capacity: int,
        unauthenticated_refill_rate: float,
        authenticated_capacity: int,
        authenticated_refill_rate: float,
    ) -> None:
        """
        Constructor

        :param app: the ASGI app
        :param unauthenticated_capacity: the capacity of the unauthenticated token bucket
        :param unauthenticated_refill_rate: the refill rate of the unauthenticated token bucket
        :param authenticated_capacity: the capacity of the authenticated token bucket
        :param authenticated_refill_rate: the refill rate of the authenticated token bucket
        """

        super().__init__(app)

        self._unauthenticated_bucket = TokenBucket(
            capacity=unauthenticated_capacity, refill_rate=unauthenticated_refill_rate
        )
        self._authenticated_bucket = TokenBucket(capacity=authenticated_capacity, refill_rate=authenticated_refill_rate)

    async def dispatch(self, request: Request, call_next):
        client_id = request.client.host  # Use IP address as the client identifier

        consumed = self._unauthenticated_bucket.consume(client_id)
        if consumed:
            response = await call_next(request)
            if "user_id" in request.state and (user_id := request.state.user_id) is not None:
                # Use authenticated bucket for rate limiting instead
                self._unauthenticated_bucket.refund(client_id, count=1)
                consumed = self._authenticated_bucket.consume(user_id)

        if not consumed:
            return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"message": "Too Many Requests"})

        return response
