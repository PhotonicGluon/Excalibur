import logging
import os

from fastapi import APIRouter, FastAPI

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
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Add middlewares
add_middleware(app, logger)

# Include routes
master_router = APIRouter(prefix="/api")

master_router.include_router(auth_router, prefix="/auth")
master_router.include_router(users_router, prefix="/users")
master_router.include_router(files_router, prefix="/files")
master_router.include_router(well_known_router, prefix="/well-known")

# Include PWA if present
setup_pwa()

# Finally, include the master router
app.include_router(master_router)
