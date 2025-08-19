import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.consts import MAX_FILE_SIZE
from excalibur_server.src.middleware.rate_limit import RateLimitMiddleware

ALLOW_ORIGINS = [
    "capacitor://localhost",  # Capacitor on iOS
    "http://localhost",  # Capacitor on Android
    "http://localhost:5173",  # Vite development server
    "http://localhost:8100",  # Local development server for Ionic
]

TOKEN_CAPACITY = 20
TOKEN_REFILL_RATE = 1


def add_middleware(app: FastAPI):
    # Add CORS middleware
    allow_origins = ALLOW_ORIGINS
    if os.getenv("EXCALIBUR_SERVER_ENABLE_CORS") == "0":
        allow_origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    # Add rate limit middleware if not debugging
    if not os.getenv("EXCALIBUR_SERVER_DEBUG"):
        app.add_middleware(
            RateLimitMiddleware,
            capacity=TOKEN_CAPACITY,
            refill_rate=TOKEN_REFILL_RATE,
        )
    # Add artificial delay
    artificial_delay = float(os.environ.get("EXCALIBUR_SERVER_DELAY_RESPONSES", 0))
    if artificial_delay > 0:
        # Add artificial delay
        @app.middleware("http")
        async def add_artificial_delay(request, call_next):
            await asyncio.sleep(artificial_delay)
            return await call_next(request)

    # Encrypt responses for specific routes
    from excalibur_server.src.middleware.crypto.middleware import RouteEncryptionMiddleware

    app.add_middleware(
        RouteEncryptionMiddleware, encrypt_response=os.environ.get("EXCALIBUR_SERVER_ENCRYPT_RESPONSES", "1") != "0"
    )

    # Add a file size limit middleware
    from excalibur_server.src.middleware import LimitUploadSizeMiddleware

    app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=MAX_FILE_SIZE)
