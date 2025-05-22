from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .routes import generate_token_endpoint

__all__ = ["router"]
