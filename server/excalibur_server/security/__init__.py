from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .routes import generate_token

__all__ = ["router"]
