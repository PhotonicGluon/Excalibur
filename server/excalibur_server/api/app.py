import logging
import os
import time

from fastapi import FastAPI

from excalibur_server.api.middlewares import add_middleware
from excalibur_server.meta import SUMMARY, TITLE, VERSION
from excalibur_server.src.config import CONFIG

from .log_filters import EndpointFilter
from .meta import TAGS
from .routes import auth_router, files_router, users_router, well_known_router

logger = logging.getLogger("uvicorn.error")

# Add endpoint filter to access logger
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(excluded_endpoints=CONFIG.api.logging.no_log))

# Configure logging to file
file_handler = logging.FileHandler(CONFIG.api.logging.logs_dir / f"{int(time.time())}.log", mode="a", encoding="utf-8")
file_handler.setFormatter(logging.Formatter(CONFIG.api.logging.file_format))

logger.addHandler(file_handler)
logger.propagate = True

uvicorn_access_logger.addHandler(file_handler)
uvicorn_access_logger.propagate = True

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
