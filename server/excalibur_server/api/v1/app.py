import asyncio
import os

from fastapi import FastAPI

from excalibur_server.api.meta import SUMMARY, TITLE

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
from excalibur_server.api.v1.security.crypto.middleware import RouteEncryptionMiddleware

app.add_middleware(
    RouteEncryptionMiddleware, encrypt_response=os.environ.get("EXCALIBUR_SERVER_ENCRYPT_RESPONSES", "1") != "0"
)

# Add a file size limit middleware
from excalibur_server.api.v1.files.middleware import LimitUploadSizeMiddleware

app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=100_000 * 1024)  # 100 MiB

# Include routes
from .files.routes import router as files_router
from .security.routes import router as security_router

app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
