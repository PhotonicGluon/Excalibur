from starlette.datastructures import MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from excalibur_server.src.exef import ExEF
from excalibur_server.src.middleware.crypto.routing import ROUTING_TREE
from excalibur_server.src.middleware.crypto.structures import EncryptedRoute
from excalibur_server.src.security.auth.token import CREDENTIALS_EXCEPTION, decode_token
from excalibur_server.src.security.cache import VALID_UUIDS_CACHE


class RouteEncryptionMiddleware:
    """
    Middleware that encrypts the traffic of encrypted routes.
    """

    def __init__(self, app: ASGIApp, encrypt_response: bool = True) -> None:
        """
        Constructor

        :param app: The ASGI app
        :param encrypt_response: Whether to encrypt the response
        """

        self.app = app
        self.encrypt_response = encrypt_response

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Handles the request

        :param scope: The scope
        :param receive: The receive function
        :param send: The send function
        """

        # We only handle HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Check if the route should be encrypted
        path = scope["path"]
        method = scope["method"]
        route_data = ROUTING_TREE.traverse(path).get(method)
        if route_data is None:
            # Pass through
            await self.app(scope, receive, send)
            return

        # Handle using the actual handler
        handler = EncryptionHandler(self.app, route_data, self.encrypt_response)
        await handler(scope, receive, send)


class EncryptionHandler:
    """
    Handles the encryption of the request and response.
    """

    def __init__(self, app: ASGIApp, route_data: EncryptedRoute, encrypt_response: bool) -> None:
        """
        Constructor

        :param app: The ASGI app
        :param route_data: The route data
        :param encrypt_response: Whether to encrypt the response
        """

        self.app = app
        self.route_data = route_data

        self._scope: Scope | None = None
        self._receive: Receive | None = None
        self._send: Send | None = None

        self._e2ee_key: bytes | None = None

        self._initial_message: Message | None = None
        self._started_response: bool = False

        self._should_encrypt_response: bool = self.route_data.encrypted_response and encrypt_response
        self._to_raise_credentials_exception: bool = False

    # Magic methods
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        """
        Handles the request

        :param scope: The scope
        :param receive: The receive function
        :param send: The send function
        """

        self._scope = scope
        self._receive = receive
        self._send = send

        # # Try to set the E2EE key using the scope headers
        self._set_e2ee_key(MutableHeaders(scope=scope))
        exef: ExEF | None = None

        async def receive_wrapper() -> Message:
            nonlocal exef

            message = await receive()

            # Check if the incoming request needs to be decrypted
            if not self.route_data.encrypted_body:
                return message

            headers = MutableHeaders(scope=self._scope)
            if headers.get("X-Encrypted", "false") == "false":
                return message

            # Try to set the E2EE key using the scope headers
            if self._e2ee_key is None:
                self._set_e2ee_key(MutableHeaders(scope=scope))
                if self._e2ee_key is None:
                    # We wanted to decrypt but no key was found...
                    self._to_raise_credentials_exception = True
                    return
            if exef is None:
                exef = ExEF(self._e2ee_key)

            # Decrypt body
            decrypted_body = b""
            while decrypted_body == b"":
                encrypted_body: bytes = message.get("body", b"")
                exef.decryptor.update(encrypted_body)
                decrypted_body = exef.decryptor.get()

                if decrypted_body == b"":
                    message = await receive()

            if exef.decryptor.fully_processed:
                exef.decryptor.verify()

            message["body"] = decrypted_body

            # Update headers
            headers = MutableHeaders(raw=self._scope["headers"])
            headers["Content-Length"] = str(len(decrypted_body))
            if "X-Content-Type" in headers:
                headers["Content-Type"] = headers["X-Content-Type"]
                del headers["X-Content-Type"]
            if "X-Encrypted" in headers:
                del headers["X-Encrypted"]

            self._scope["headers"] = headers.raw

            return message

        async def send_wrapper(message: Message) -> None:
            """
            Handles the outgoing response.

            :param message: The message to be sent
            """

            nonlocal exef

            if self._to_raise_credentials_exception:
                return await self._raise_credentials_exception()

            # Check if need to encrypt response
            if not self._should_encrypt_response:
                await send(message)
                return

            message_type = message["type"]
            if message_type == "http.response.start" and message["status"] in self.route_data.excluded_statuses:
                self._should_encrypt_response = False
                await send(message)
                return

            if self._e2ee_key is None:
                # Try again using the headers
                self._set_e2ee_key(MutableHeaders(scope=message))

                if self._e2ee_key is None:
                    # Wanted to encrypt but still no key found
                    return await self._raise_credentials_exception()

            if exef is None and not self._started_response:
                exef = ExEF(self._e2ee_key)

            # Encrypt response
            message_type = message["type"]
            if message_type == "http.response.start":
                # Don't send the initial message until we've determined how to modify the outgoing headers correctly
                self._initial_message = message
                self._started_response = False

                # Get content length of the new message
                headers = MutableHeaders(raw=message["headers"])
                content_length = headers.get("Content-Length")
                if content_length is None:
                    raise ValueError("Content-Length header not found")
                content_length = int(content_length)
                new_content_length = content_length + ExEF.additional_size

                # Set headers
                headers["Content-Type"] = "application/octet-stream"
                headers["Content-Length"] = str(new_content_length)
                headers["Access-Control-Expose-Headers"] = "X-Encrypted"
                headers["X-Encrypted"] = "true"

                self._initial_message["headers"] = headers.raw

                # Set parameters
                exef.encryptor.set_params(length=content_length)

                # Now send the message
                await self._send(self._initial_message)
                return
            if message_type == "http.response.body":
                # Encrypt body
                plaintext_body = message.get("body", b"")
                exef.encryptor.update(plaintext_body)

                # Determine what we need to send
                to_send = None
                if not self._started_response:
                    # Need to send both header and the initial body
                    header = exef.encryptor.get()
                    encrypted_body = exef.encryptor.get()
                    to_send = header + encrypted_body
                else:
                    # Just need to send the body
                    encrypted_body = exef.encryptor.get()
                    to_send = encrypted_body

                if exef.encryptor.fully_processed:
                    footer = exef.encryptor.get()
                    to_send += footer

                message["body"] = to_send

                # Update headers
                message["headers"] = self._initial_message["headers"]

                # Send message
                if not self._started_response:
                    self._started_response = True
                await self._send(message)

        await self.app(scope, receive_wrapper, send_wrapper)

    # Helper functions
    async def _raise_credentials_exception(self) -> None:
        """
        Raises the credentials exception, returning a JSON response.
        """

        response = JSONResponse(
            {"detail": f"Middleware processing: {CREDENTIALS_EXCEPTION.detail}"},
            status_code=CREDENTIALS_EXCEPTION.status_code,
            headers=CREDENTIALS_EXCEPTION.headers,
            media_type="application/json",
        )
        await response(self._scope, self._receive, self._send)

    def _set_e2ee_key(self, headers: MutableHeaders) -> None:
        """
        Tries to set the E2EE key.

        :param headers: The headers
        """

        if self._e2ee_key is not None:
            return

        # Try to obtain the UUID
        uuid = None
        if headers.get("Authorization") is not None:
            auth = headers.get("Authorization").split(" ")
            if auth[0] == "Bearer" and len(auth) == 2:
                token = decode_token(auth[1])
                if token is None:
                    return None
                uuid = token["sub"]
        elif headers.get("uuid") is not None:  # Patched in from an endpoint
            uuid = headers.get("uuid")
            del headers["uuid"]

        # Try to obtain the E2EE key
        e2ee_key = VALID_UUIDS_CACHE.get(uuid, (None, None))[0]

        # Update cache
        self._e2ee_key = e2ee_key
