# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["well-known"])

# Include all well-known endpoints
from .compatibility import compatible_endpoint as compatible_endpoint
from .version import version_endpoint as version_endpoint
