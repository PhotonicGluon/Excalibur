from fastapi import APIRouter

router = APIRouter(
    tags=["well-known"],
)

# Include all well-known endpoints
from .heartbeat import heartbeat_endpoint
from .version import version_endpoint
from .clock import clock_endpoint
