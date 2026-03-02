import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.env import get_artificial_delay, has_cors, is_debug
from excalibur_server.src.config import CONFIG
from excalibur_server.src.middleware.delayer import DelayMiddleware
from excalibur_server.src.middleware.rate_limit import RateLimitMiddleware


def add_middleware(app: FastAPI, logger: logging.Logger):
    # Add CORS middleware
    allow_origins = CONFIG.server.allow_origins
    if not has_cors():
        allow_origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    # Add rate limit middleware
    if not is_debug():
        app.add_middleware(
            RateLimitMiddleware,
            capacity=CONFIG.server.rate_limit.capacity,
            refill_rate=CONFIG.server.rate_limit.refill_rate,
        )

    # Add artificial delay
    artificial_delay = get_artificial_delay()
    if artificial_delay != (0, 0):
        logger.warning(f"Artificial delay enabled (in {artificial_delay[0]} ms, out {artificial_delay[1]} ms).")
        app.add_middleware(DelayMiddleware, delay_in=artificial_delay[0], delay_out=artificial_delay[1])

    # Encrypt responses for specific routes
    from excalibur_server.src.middleware.crypto.middleware import RouteEncryptionMiddleware

    app.add_middleware(
        RouteEncryptionMiddleware, encrypt_response=os.environ.get("EXCALIBUR_SERVER_ENCRYPT_RESPONSES", "1") != "0"
    )

    # Add a file size limit middleware
    from excalibur_server.src.middleware import LimitUploadSizeMiddleware

    app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=CONFIG.storage.max_upload_size)
