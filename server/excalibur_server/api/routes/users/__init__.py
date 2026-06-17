# ruff: noqa: E402
from fastapi import APIRouter, Depends, status

from excalibur_server.src.auth.credentials import get_credentials

router = APIRouter(tags=["users"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

# Add other endpoints
from .additional_info import edit_additional_user_info_endpoint as edit_additional_user_info_endpoint
from .additional_info import get_additional_user_info_endpoint as get_additional_user_info_endpoint
from .crud import check_user_endpoint as check_user_endpoint
from .crud import edit_password_endpoint as edit_password_endpoint
from .crud import edit_username_endpoint as edit_username_endpoint
from .security_details import get_user_security_details_endpoint as get_user_security_details_endpoint
from .vault_key import get_user_vault_key_endpoint as get_user_vault_key_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
