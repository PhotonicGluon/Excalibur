# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["users"])

# Add other endpoints
from .additional_info import edit_additional_user_info_endpoint as edit_additional_user_info_endpoint
from .additional_info import get_additional_user_info_endpoint as get_additional_user_info_endpoint
from .crud import check_user_endpoint as check_user_endpoint
from .security_details import get_user_security_details_endpoint as get_user_security_details_endpoint
from .vault_key import get_user_vault_key_endpoint as get_user_vault_key_endpoint

__all__ = ["router"]
