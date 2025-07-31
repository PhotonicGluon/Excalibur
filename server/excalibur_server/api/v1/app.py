# ruff: noqa: E402
import asyncio
import os

from fastapi import FastAPI

from excalibur_server.consts import MAX_FILE_SIZE
from excalibur_server.meta import SUMMARY, TITLE

from .meta import TAGS

# Define app
app = FastAPI(title=TITLE, summary=SUMMARY, version="API V1", openapi_tags=TAGS)


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

# Include routes
from .files import router as files_router
from .security import router as security_router
from .well_known import router as well_known_router

app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
app.include_router(well_known_router, prefix="/well-known")
