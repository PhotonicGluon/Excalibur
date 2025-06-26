import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.api.cors import ALLOW_ORIGINS

from .log_filters import EndpointFilter
from .meta import SUMMARY, TITLE, VERSION

NO_LOG_ENDPOINTS = ["/api/v1/well-known/heartbeat"]

# Add logging filter
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(NO_LOG_ENDPOINTS))

# Define app
app = FastAPI(
    title=TITLE,
    summary=SUMMARY,
    version=VERSION,
    description="To access a specific version's API, use `/api/v1/...`. To access the documentation for a specific version, use `/api/v1/docs`.",
    root_path="/api",
)

# Mount other apps
from excalibur_server.api.v1.app import app as api_v1

app.mount("/v1", api_v1)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# Define other routes
@app.get("/")
def index_page():
    return f"Excalibur Server, version {VERSION}"
