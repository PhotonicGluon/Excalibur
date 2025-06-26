from fastapi import APIRouter

router = APIRouter(
    tags=["well-known"],
)

# Include all well-known endpoints
from .heartbeat import heartbeat_endpoint
