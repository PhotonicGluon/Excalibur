# ruff: noqa: E402
from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .auth import auth_endpoint as auth_endpoint
from .security_details import check_security_details_endpoint as check_security_details_endpoint
from .security_details import get_security_details_endpoint as get_security_details_endpoint
from .security_details import set_security_details_endpoint as set_security_details_endpoint
from .vault_key import check_vault_key_endpoint as check_vault_key_endpoint
from .vault_key import get_vault_key_endpoint as get_vault_key_endpoint
from .vault_key import set_vault_key_endpoint as set_vault_key_endpoint

__all__ = ["router"]
