from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from excalibur_server.src.crypto.exef import ExEF


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    """
    Middleware that limits the size of uploaded files.

    Note that this middleware will allow requests with a content length that is 1024 bytes more than
    the maximum permitted upload size. This is to account for the additional content size for the
    multipart file upload format.
    """

    def __init__(self, app: ASGIApp, max_upload_size: int) -> None:
        """
        Constructor

        :param app: the ASGI app
        :param max_upload_size: the maximum size of *unencrypted* uploaded files in bytes
        """

        super().__init__(app)
        self.max_upload_size = (
            max_upload_size
            + ExEF.additional_size  # For the actual encrypted file (which is an ExEF stream)
            + 1024  # For the transmission (which includes multipart form data)
        )

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Handles the request

        :param request: the request
        :param call_next: the next function in the chain
        :return: the response
        """

        if request.method == "POST":
            if "content-length" not in request.headers:
                return Response(
                    status_code=status.HTTP_411_LENGTH_REQUIRED,
                    content={"message": "Content-Length header is required"},
                )

            content_length = int(request.headers["content-length"])
            if content_length > self.max_upload_size:
                return Response(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={"message": "Request body too large"},
                )

        return await call_next(request)
