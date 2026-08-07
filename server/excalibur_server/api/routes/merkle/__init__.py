# ruff: noqa: E402
from fastapi import APIRouter, Depends, status

from excalibur_server.src.auth.credentials import get_credentials

router = APIRouter(tags=["merkle"])
encrypted_router = APIRouter(
    tags=["encrypted"],
    dependencies=[Depends(get_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)

# Add endpoints
from .attestation import get_all_attestations_endpoint as get_all_attestations_endpoint
from .attestation import get_latest_attestation_endpoint as get_latest_attestation_endpoint

# Add encrypted routes to overall router
router.include_router(encrypted_router)
__all__ = ["router"]
