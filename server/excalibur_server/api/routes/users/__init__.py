# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["users"])

# Include routers
from .additional_info import info_router

router.include_router(info_router, prefix="/info")

# Add other endpoints
from .crud import check_user_endpoint as check_user_endpoint
from .security_details import get_user_security_details_endpoint as get_user_security_details_endpoint
from .vault_key import get_user_vault_key_endpoint as get_user_vault_key_endpoint

__all__ = ["router"]
