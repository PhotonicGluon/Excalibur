from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .security_details import (
    check_security_details_endpoint,
    get_security_details_endpoint,
    set_security_details_endpoint,
)
from .auth import login_endpoint
from .vault_key import check_vault_key_endpoint, get_vault_key_endpoint, set_vault_key_endpoint
from .srp import router as srp_router

router.include_router(srp_router, prefix="/srp")

__all__ = ["router"]
