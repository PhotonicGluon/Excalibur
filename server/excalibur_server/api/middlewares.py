import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.src.config import CONFIG
from excalibur_server.src.middleware.rate_limit import RateLimitMiddleware


def add_middleware(app: FastAPI, logger: logging.Logger):
    # Add CORS middleware
    allow_origins = CONFIG.api.allow_origins
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
            capacity=CONFIG.api.rate_limit.capacity,
            refill_rate=CONFIG.api.rate_limit.refill_rate,
        )
    # Add artificial delay
    artificial_delay = float(os.environ.get("EXCALIBUR_SERVER_DELAY_RESPONSES", 0))
    if artificial_delay > 0:
        logger.warning(f"Artificial delay of {artificial_delay} seconds enabled.")

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

    app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=CONFIG.server.max_file_size)
