import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from excalibur_server.api.cors import ALLOW_ORIGINS
from excalibur_server.src.middleware.rate_limit import RateLimitMiddleware

from .log_filters import EndpointFilter
from .meta import SUMMARY, TITLE, VERSION

NO_LOG_ENDPOINTS = ["/api/v1/well-known/heartbeat"]

TOKEN_CAPACITY = 20
TOKEN_REFILL_RATE = 1

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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Add rate limit middleware
app.add_middleware(
    RateLimitMiddleware,
    capacity=TOKEN_CAPACITY,
    refill_rate=TOKEN_REFILL_RATE,
)

# Mount other apps
from excalibur_server.api.v1.app import app as api_v1

app.mount("/v1", api_v1)


# Define other routes
@app.get("/")
def index_page():
    return f"Excalibur Server, version {VERSION}"
