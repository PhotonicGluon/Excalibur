from fastapi import FastAPI

# Define app
from excalibur_server.api.meta import TITLE, SUMMARY

from .meta import TAGS

app = FastAPI(title=TITLE, summary=SUMMARY, version="API V1", openapi_tags=TAGS)

# Encrypt responses for specific routes
from excalibur_server.api.v1.security.crypto.middleware import ResponseEncryptionMiddleware

app.add_middleware(ResponseEncryptionMiddleware)

# Include routes
from .files.routes import router as files_router
from .security.routes import router as security_router

app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
