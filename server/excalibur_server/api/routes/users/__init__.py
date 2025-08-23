# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["users"])

# Add other endpoints
from .user import add_user_endpoint as add_user_endpoint
from .user import check_user_endpoint as check_user_endpoint
from .user import get_user_security_details_endpoint as get_user_security_details_endpoint
from .user import get_user_vault_key_endpoint as get_user_vault_key_endpoint

__all__ = ["router"]
