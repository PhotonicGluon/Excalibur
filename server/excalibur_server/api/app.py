import logging

from fastapi import FastAPI

from excalibur_server.api.middlewares import add_middleware
from excalibur_server.meta import SUMMARY, TITLE, VERSION

from .log_filters import EndpointFilter
from .meta import TAGS
from .routes import files_router, security_router, well_known_router

NO_LOG_ENDPOINTS = ["/api/well-known/heartbeat"]

# Add logging filter
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(NO_LOG_ENDPOINTS))

# Define app
app = FastAPI(
    title=TITLE,
    summary=SUMMARY,
    version=VERSION,
    openapi_tags=TAGS,
    root_path="/api",
)

# Add middlewares
add_middleware(app)

# Include routes
app.include_router(files_router, prefix="/files")
app.include_router(security_router, prefix="/security")
app.include_router(well_known_router, prefix="/well-known")
