from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to the response.
    """

    def __init__(self, app: ASGIApp) -> None:
        """
        Constructor

        :param app: the ASGI app
        """

        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"  # Prevent MIME type sniffing
        response.headers["X-Frame-Options"] = "DENY"  # Prevent clickjacking by disallowing iframe embedding

        return response
