# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["auth"])

from .comms import comms_endpoint as comms_endpoint
from .info import get_group_size_endpoint as get_group_size_endpoint

__all__ = ["router"]
