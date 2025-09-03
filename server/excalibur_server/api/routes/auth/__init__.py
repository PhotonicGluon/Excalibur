# ruff: noqa: E402
from fastapi import APIRouter

from excalibur_server.api.misc import is_debug

router = APIRouter(tags=["auth"])

from .comms import comms_endpoint as comms_endpoint
from .info import get_group_size_endpoint as get_group_size_endpoint

if is_debug():
    from .util import get_token_endpoint as get_token_endpoint

__all__ = ["router"]
