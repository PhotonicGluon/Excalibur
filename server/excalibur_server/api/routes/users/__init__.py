# ruff: noqa: E402
from fastapi import APIRouter, Depends, status

from excalibur_server.env import is_debug
from excalibur_server.src.auth.credentials import get_credentials

router = APIRouter(tags=["users"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

# Add other endpoints
from .vault_info import get_user_vault_info_endpoint as get_user_vault_info_endpoint

if is_debug():
    from .crud import check_user_endpoint as check_user_endpoint
    from .crud import remove_user_endpoint as remove_user_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
