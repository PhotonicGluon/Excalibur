from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .generate_token import generate_token_endpoint
from .srp import router as srp_router

router.include_router(srp_router, prefix="/srp")

__all__ = ["router"]
