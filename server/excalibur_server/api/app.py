import logging

from fastapi import APIRouter, FastAPI

from excalibur_server.api.middlewares import add_middleware
from excalibur_server.env import has_cors_validation, has_encryption, has_pop_checking, is_debug
from excalibur_server.meta import SUMMARY, TITLE, VERSION

from .logging import logger
from .meta import TAGS
from .routes import auth_router, files_router, users_router, well_known_router

# Check for enabled flags
if is_debug():
    logger.warning("Debug mode is enabled.")
    logger.setLevel(logging.DEBUG)

if not has_encryption():
    logger.warning("Encryption is disabled.")

if not has_cors_validation():
    logger.warning("CORS validation is disabled. This is not recommended for production.")

if not has_pop_checking():
    logger.warning("Proof of Possession (PoP) checking is disabled. This is not recommended for production.")


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

# Finally, include the master router
app.include_router(master_router)
