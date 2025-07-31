# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["well-known"])

# Include all well-known endpoints
from .clock import clock_endpoint as clock_endpoint
from .compatibility import compatible_endpoint as compatible_endpoint
from .heartbeat import heartbeat_endpoint as heartbeat_endpoint
from .version import version_endpoint as version_endpoint
