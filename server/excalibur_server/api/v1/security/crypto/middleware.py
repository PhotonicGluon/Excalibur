from typing import Awaitable, Callable

from fastapi import Request, Response, status
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from excalibur_server.api.v1.security.auth.token import CREDENTIALS_EXCEPTION, decode_token
from excalibur_server.api.v1.security.cache import VALID_UUIDS_CACHE
from excalibur_server.api.v1.security.crypto.crypto import encrypt

encrypted_routes = {}


class EncryptedRoute(BaseModel):
    excluded_statuses: list[int]


class EncryptResponse:
    """
    Used as a dependency for a route to be added to the list of encrypted routes.
    """

    def __init__(self, excluded_statuses: list[int] = None):
        """
        Initializes the EncryptResponse class.

        :param excluded_statuses: list of status codes that should not be encrypted. Defaults to the
            single element 401
        """

        if excluded_statuses is None:
            excluded_statuses = [status.HTTP_401_UNAUTHORIZED]
        self._excluded_statuses = excluded_statuses

    def __call__(
        self,
        request: Request,
    ) -> Request:
        encrypted_routes[request.url.path] = EncryptedRoute(excluded_statuses=self._excluded_statuses)
        return request


class ResponseEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Middleware that encrypts the response body of encrypted routes.
    """

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)

        # Check if route is part of the list of encrypted routes
        if request.url.path not in encrypted_routes:
            return response

        # Check if status code is in the list of excluded statuses
        if response.status_code in encrypted_routes[request.url.path].excluded_statuses:
            return response

        # Dump the response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        # Try to obtain the UUID
        uuid = None
        if request.headers.get("authorization") is not None:
            auth = request.headers.get("authorization").split(" ")
            if auth[0] == "Bearer":
                # No need to worry about invalid token since the bearer token check passed already
                # during initial authorization phase
                uuid = decode_token(auth[1])["uuid"]
        elif response.headers.get("uuid") is not None:  # Patched in from an endpoint
            uuid = response.headers.get("uuid")
            del response.headers["uuid"]

        # Try to obtain the master key
        master_key = VALID_UUIDS_CACHE.get(uuid)
        if uuid is None or master_key is None:
            return Response(
                content=f'{{"detail": "{CREDENTIALS_EXCEPTION.detail}"}}'.encode("UTF-8"),
                status_code=CREDENTIALS_EXCEPTION.status_code,
                headers=CREDENTIALS_EXCEPTION.headers,
                media_type="application/json",
            )

        # Encrypt the response body
        encrypted_response = encrypt(response_body, master_key)
        to_return = encrypted_response.model_dump_json().encode("UTF-8")

        # Update headers
        response.headers["Content-Length"] = str(len(to_return))
        response.headers["Content-Type"] = "application/json"

        # Return the encrypted response
        return Response(
            content=to_return,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )
