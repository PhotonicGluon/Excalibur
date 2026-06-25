# ruff: noqa: E402
from fastapi import APIRouter

from excalibur_server.env import is_debug

router = APIRouter(tags=["auth"])

from .comms import opaque_comms_endpoint as opaque_comms_endpoint
from .comms import opaque_registration_endpoint as opaque_registration_endpoint
from .info import get_user_auth_info_endpoint as get_user_auth_info_endpoint
from .token import get_token_endpoint as get_token_endpoint

if is_debug():
    from .pop_demo import demo_get_endpoint as demo_get_endpoint
    from .pop_demo import demo_post_encrypted_endpoint as demo_post_encrypted_endpoint
    from .pop_demo import demo_post_endpoint as demo_post_endpoint
    from .public_key import get_server_public_key_endpoint as get_server_public_key_endpoint
    from .token import generate_pop_endpoint as generate_pop_endpoint
    from .token import generate_token_endpoint as generate_token_endpoint

__all__ = ["router"]
