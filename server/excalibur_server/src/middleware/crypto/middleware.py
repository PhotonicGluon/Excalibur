from typing import Awaitable, Callable

from starlette.datastructures import MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.consts import KEY
from excalibur_server.src.auth.credentials import CREDENTIALS_EXCEPTION, decode_token
from excalibur_server.src.exef import ExEF
from excalibur_server.src.middleware.crypto.routing import ROUTING_TREE
from excalibur_server.src.middleware.crypto.structures import EncryptedRoute


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
        Handles the request.

        :param scope: The scope
        :param receive: The receive function
        :param send: The send function
        """

        self._scope = scope
        self._receive = receive
        self._send = send
        self._exef: ExEF | None = None

        # Try to set the E2EE key using the scope headers
        self._set_e2ee_key(MutableHeaders(scope=scope))

        await self.app(scope, self._receive_wrapper(scope), self._send_wrapper())

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

        # Try to obtain the e2ee data
        if headers.get("Authorization") is None:
            return

        auth = headers.get("Authorization").split(" ")
        if auth[0] != "Bearer" or len(auth) != 2:
            return

        token = decode_token(auth[1], KEY)
        if token is None:
            return

        # Get master key
        if "uuid" not in token:
            return

        comm_uuid = token["uuid"]
        if comm_uuid not in MASTER_KEYS_CACHE:
            return

        self._e2ee_key = MASTER_KEYS_CACHE[comm_uuid]

    async def _decrypt_request(self, message: Message) -> Message:
        """
        Decrypts the request.

        :param message: The message to decrypt
        :return: The decrypted message
        """

        # Decrypt body
        decrypted_body = b""
        while decrypted_body == b"":
            encrypted_body: bytes = message.get("body", b"")
            self._exef.decryptor.update(encrypted_body)
            decrypted_body = self._exef.decryptor.get()

            if decrypted_body == b"":
                message = await self._receive()

        if self._exef.decryptor.fully_processed:
            self._exef.decryptor.verify()

        message["body"] = decrypted_body

        # Update headers
        headers = MutableHeaders(raw=self._scope["headers"])
        headers["Content-Length"] = str(len(decrypted_body))

        # TODO: Determine if `X-Content-Type` needs to be deleted
        # if "X-Content-Type" in headers:
        #     headers["Content-Type"] = headers["X-Content-Type"]
        #     del headers["X-Content-Type"]

        # UPDATE: We stop deleting `X-Encrypted` because this was messing up some of the large file uploads
        # if "X-Encrypted" in headers:
        #     del headers["X-Encrypted"]

        self._scope["headers"] = headers.raw

        return message

    async def _encrypt_response(self, message: Message):
        """
        Encrypts the response and send it.

        :param message: The message to encrypt
        """

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
            self._exef.encryptor.set_params(length=content_length)

            # Now send the message
            await self._send(self._initial_message)
            return

        if message_type == "http.response.body":
            if message.get("body", b"") == b"":
                await self._send(message)
                return

            # Encrypt body
            plaintext_body = message["body"]
            self._exef.encryptor.update(plaintext_body)

            # Determine what we need to send
            to_send = None
            if not self._started_response:
                # Need to send both header and the initial body
                header = self._exef.encryptor.get()
                encrypted_body = self._exef.encryptor.get()
                to_send = header + encrypted_body
            else:
                # Just need to send the body
                encrypted_body = self._exef.encryptor.get()
                to_send = encrypted_body

            if self._exef.encryptor.fully_processed:
                footer = self._exef.encryptor.get()
                to_send += footer

            message["body"] = to_send

            # Update headers
            message["headers"] = self._initial_message["headers"]

            # Send message
            if not self._started_response:
                self._started_response = True
            await self._send(message)

    def _receive_wrapper(self, scope: Scope) -> Callable[[], Awaitable[Message]]:
        """
        Wrapper for the receive function.

        :param scope: The scope
        :return: The receive function, which decrypts the request if needed
        """

        async def wrapper() -> Message:
            message = await self._receive()

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
                    return message

            if self._exef is None:
                self._exef = ExEF(self._e2ee_key)

            return await self._decrypt_request(message)

        return wrapper

    def _send_wrapper(self) -> Callable[[Message], Awaitable[None]]:
        """
        Wrapper for the send function.

        :return: The send function, which encrypts the response if needed
        """

        async def wrapper(message: Message) -> None:
            """
            Handles the outgoing response.

            :param message: The message to be sent
            """

            if self._to_raise_credentials_exception:
                return await self._raise_credentials_exception()

            # Check if need to encrypt response
            if not self._should_encrypt_response:
                await self._send(message)
                return

            message_type = message["type"]
            if message_type == "http.response.start" and message["status"] in self.route_data.excluded_statuses:
                self._should_encrypt_response = False
                await self._send(message)
                return

            if self._e2ee_key is None:
                # Try again using the headers
                if "headers" in message:
                    self._set_e2ee_key(MutableHeaders(scope=message))

                if self._e2ee_key is None:
                    # Wanted to encrypt but still no key found
                    return await self._raise_credentials_exception()

            if self._exef is None and not self._started_response:
                self._exef = ExEF(self._e2ee_key)

            await self._encrypt_response(message)

        return wrapper
