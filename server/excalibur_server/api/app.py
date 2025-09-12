import logging
import os

from fastapi import FastAPI

from excalibur_server.api.middlewares import add_middleware
from excalibur_server.api.pwa import setup_pwa
from excalibur_server.meta import SUMMARY, TITLE, VERSION

from .logging import logger
from .meta import TAGS
from .routes import auth_router, files_router, users_router, well_known_router

# Check for enabled flags
if os.getenv("EXCALIBUR_SERVER_DEBUG") == "1":
    logger.warning("Debug mode is enabled.")
    logger.setLevel(logging.DEBUG)

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

# Include PWA if present
# TODO: Toggle bundling of PWA
setup_pwa()
