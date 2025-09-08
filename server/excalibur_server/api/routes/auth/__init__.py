# ruff: noqa: E402
from fastapi import APIRouter

from excalibur_server.api.misc import is_debug

router = APIRouter(tags=["auth"])

from .comms import comms_endpoint as comms_endpoint
from .info import get_group_size_endpoint as get_group_size_endpoint

if is_debug():
    from .hmac_demo import demo_get_endpoint as demo_get_endpoint
    from .hmac_demo import demo_post_encrypted_endpoint as demo_post_encrypted_endpoint
    from .hmac_demo import demo_post_endpoint as demo_post_endpoint
    from .util import get_token_endpoint as get_token_endpoint

__all__ = ["router"]
