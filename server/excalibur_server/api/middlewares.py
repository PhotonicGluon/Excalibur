import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.src.config import CONFIG
from excalibur_server.src.middleware.delayer import DelayMiddleware
from excalibur_server.src.middleware.rate_limit import RateLimitMiddleware


def add_middleware(app: FastAPI, logger: logging.Logger):
    # Add CORS middleware
    allow_origins = CONFIG.server.allow_origins
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
    if os.getenv("EXCALIBUR_SERVER_DEBUG", "0") != "1":
        app.add_middleware(
            RateLimitMiddleware,
            capacity=CONFIG.server.rate_limit.capacity,
            refill_rate=CONFIG.server.rate_limit.refill_rate,
        )

    # Add artificial delay
    delay_str = os.getenv("EXCALIBUR_SERVER_DELAY_RESPONSES", "0,0")
    if delay_str != "0,0":
        delays = tuple(map(int, delay_str.split(",")))
        logger.warning(f"Artificial delay enabled (in {delays[0]} ms, out {delays[1]} ms).")
        app.add_middleware(DelayMiddleware, delay_in=delays[0], delay_out=delays[1])

    # Encrypt responses for specific routes
    from excalibur_server.src.middleware.crypto.middleware import RouteEncryptionMiddleware

    app.add_middleware(
        RouteEncryptionMiddleware, encrypt_response=os.environ.get("EXCALIBUR_SERVER_ENCRYPT_RESPONSES", "1") != "0"
    )

    # Add a file size limit middleware
    from excalibur_server.src.middleware import LimitUploadSizeMiddleware

    app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=CONFIG.storage.max_upload_size)
