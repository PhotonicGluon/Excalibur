import logging
import os

from fastapi import FastAPI

from excalibur_server.api.middlewares import add_middleware
from excalibur_server.meta import SUMMARY, TITLE, VERSION
from excalibur_server.src.config import CONFIG

from .log_filters import EndpointFilter
from .meta import TAGS
from .routes import auth_router, files_router, users_router, well_known_router

logger = logging.getLogger("uvicorn.error")

# Add logging filter
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(excluded_endpoints=CONFIG.api.no_log))

# Check for enabled flags
if os.getenv("EXCALIBUR_SERVER_DEBUG") == "1":
    logger.warning("Debug mode is enabled.")

if os.getenv("EXCALIBUR_SERVER_ENCRYPT_RESPONSES") == "0":
    logger.warning("Encryption is disabled.")

if os.getenv("EXCALIBUR_SERVER_ENABLE_CORS") == "0":
    logger.warning("CORS is disabled. This is not recommended for production.")

# Define app
app = FastAPI(
    title=TITLE,
    summary=SUMMARY,
    version=VERSION,
    openapi_tags=TAGS,
    root_path="/api",
)

# Add middlewares
add_middleware(app, logger)

# Include routes
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(files_router, prefix="/files")
app.include_router(well_known_router, prefix="/well-known")
