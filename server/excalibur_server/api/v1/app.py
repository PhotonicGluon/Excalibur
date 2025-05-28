import asyncio

from fastapi import FastAPI

from excalibur_server.api.meta import SUMMARY, TITLE

from .meta import TAGS

ARTIFICIAL_DELAY = 0

# Define app
app = FastAPI(title=TITLE, summary=SUMMARY, version="API V1", openapi_tags=TAGS)

# Encrypt responses for specific routes
from excalibur_server.api.v1.security.crypto.middleware import ResponseEncryptionMiddleware

app.add_middleware(ResponseEncryptionMiddleware)


if ARTIFICIAL_DELAY > 0:
    # Add artificial delay
    @app.middleware("http")
    async def add_artificial_delay(request, call_next):
        await asyncio.sleep(ARTIFICIAL_DELAY)
        return await call_next(request)


# Include routes
from .files.routes import router as files_router
from .security.routes import router as security_router

app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
