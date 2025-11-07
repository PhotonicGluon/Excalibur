import asyncio
from typing import Awaitable, Callable

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class DelayMiddleware:
    """
    Middleware that delays the response by a specified amount of time.
    """

    def __init__(self, app: ASGIApp, delay_in: int = 0, delay_out: int = 0) -> None:
        """
        Constructor

        :param app: The ASGI app
        :param delay: The delay in milliseconds
        """

        self.app = app
        self.delay_in = delay_in / 1000  # In seconds
        self.delay_out = delay_out / 1000  # In seconds

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Handles the request

        :param scope: The scope
        :param receive: The receive function
        :param send: The send function
        """

        def _receive_wrapper() -> Callable[[], Awaitable[Message]]:
            """
            Wrapper for the receive function.

            :param scope: The scope
            :return: The receive function, which decrypts the request if needed
            """

            async def wrapper() -> Message:
                message = await receive()
                await asyncio.sleep(self.delay_in)
                return message

            return wrapper

        def _send_wrapper() -> Callable[[Message], Awaitable[None]]:
            """
            Wrapper for the send function.

            :return: The send function, which encrypts the response if needed
            """

            async def wrapper(message: Message) -> None:
                await asyncio.sleep(self.delay_out)
                await send(message)

            return wrapper

        await self.app(scope, _receive_wrapper(), _send_wrapper())
