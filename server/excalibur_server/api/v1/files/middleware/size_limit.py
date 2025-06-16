from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    """
    Middleware that limits the size of uploaded files.
    """

    def __init__(self, app: ASGIApp, max_upload_size: int) -> None:
        """
        Constructor

        :param app: The ASGI app
        :param max_upload_size: The maximum size of uploaded files in bytes
        """

        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Handles the request

        :param request: The request
        :param call_next: The next function in the chain
        :return: The response
        """

        if request.method == "POST":
            if "content-length" not in request.headers:
                return Response(status_code=status.HTTP_411_LENGTH_REQUIRED)
            content_length = int(request.headers["content-length"])
            if content_length > self.max_upload_size:
                return Response(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        return await call_next(request)
