import json
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from excalibur_server.api.v1.security.auth.token import CREDENTIALS_EXCEPTION, decode_token
from excalibur_server.api.v1.security.cache import VALID_UUIDS_CACHE
from excalibur_server.api.v1.security.crypto.crypto import EncryptedResponse, decrypt, encrypt
from excalibur_server.api.v1.security.crypto.middleware.routing import ROUTING_TREE


class RouteEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Middleware that encrypts the traffic of encrypted routes.
    """

    def _get_master_key(self, request: Request, response: Response | None = None) -> bytes | None:
        """
        Tries to obtain the master key from the cache based on the UUID.

        :param request: The request
        :param response: The response, if available
        :return: The master key if found, otherwise None
        """

        # Try to obtain the UUID
        uuid = None
        if request.headers.get("authorization") is not None:
            auth = request.headers.get("authorization").split(" ")
            if auth[0] == "Bearer":
                # No need to worry about invalid token since the bearer token check passed already
                # during initial authorization phase
                uuid = decode_token(auth[1])["sub"]
        elif response is not None and response.headers.get("uuid") is not None:  # Patched in from an endpoint
            uuid = response.headers.get("uuid")
            del response.headers["uuid"]

        # Try to obtain the master key
        return VALID_UUIDS_CACHE.get(uuid, (None, None))[0]

    def _raise_credentials_exception(self) -> Response:
        """
        Raises an HTTPException with the credentials exception.

        This is a shortcut for re-raising the credentials exception that was caught during the
        middleware processing.

        :return: The raised HTTPException
        """

        return Response(
            content=f'{{"detail": "Middleware processing: {CREDENTIALS_EXCEPTION.detail}"}}'.encode("UTF-8"),
            status_code=CREDENTIALS_EXCEPTION.status_code,
            headers=CREDENTIALS_EXCEPTION.headers,
            media_type="application/json",
        )

    async def _decrypt_request(self, request: Request, master_key: bytes) -> Request | None:
        """
        Decrypts the incoming request body using the provided master key.

        :param request: The incoming HTTP request containing an encrypted body.
        :param master_key: The encryption key used to decrypt the request body.
        :return: A new request object with the decrypted body, or None if decryption fails.
        """

        # Read the request body
        request_body = b""
        async for chunk in request.stream():
            request_body += chunk

        # Try to decode the request body
        try:
            request_body = json.loads(request_body)
        except json.JSONDecodeError:
            return None

        # Decrypt the request body
        decrypted_body = decrypt(EncryptedResponse(**request_body), master_key)

        # Return the decrypted request
        decrypted_request = Request(
            scope=request.scope,
            receive=request.receive,
        )
        decrypted_request._body = decrypted_body
        return decrypted_request

    async def _encrypt_response(
        self, request: Request, response: Response, master_key: bytes | None = None
    ) -> Response:
        """
        Encrypts the response body of the given response using the provided master key.

        :param request: The incoming HTTP request
        :param response: The response to encrypt
        :param master_key: The encryption key used to encrypt the response body. Defaults to None
        :return: The encrypted response
        """

        # Dump the response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        # Try to obtain the master key
        if master_key is None:
            master_key = self._get_master_key(request, response)

        if master_key is None:  # Still no master key
            return self._raise_credentials_exception()

        # Encrypt the response body
        encrypted_response = encrypt(response_body, master_key)
        to_return = encrypted_response.model_dump_json().encode("UTF-8")

        # Update headers
        response.headers["Content-Length"] = str(len(to_return))
        response.headers["Content-Type"] = "application/json"
        response.headers.append("Access-Control-Expose-Headers", "X-Encrypted")
        response.headers.append("X-Encrypted", "true")

        # Return the encrypted response
        return Response(
            content=to_return,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        path = request.url.path
        method = request.method
        route_data = ROUTING_TREE.traverse(path).get(method)

        # Check if the route should be encrypted
        if route_data is None:
            # Pass through
            return await call_next(request)

        # Try and get master key from request only
        master_key = self._get_master_key(request)

        # Check if we need to decrypt incoming request
        if not route_data.encrypted_body:
            pass
        elif request.headers.get("X-Encrypted", "false") == "false":
            pass
        else:
            if master_key is None:  # Need to decrypt but no master key
                return self._raise_credentials_exception()
            request = await self._decrypt_request(request, master_key)

        if request is None:
            return self._raise_credentials_exception()

        # Call next using decrypted request
        response = await call_next(request)

        # Check if need to encrypt response
        if not route_data.encrypted_response:
            return response
        if response.status_code in route_data.excluded_statuses:
            return response

        return await self._encrypt_response(request, response, master_key=master_key)
