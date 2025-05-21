from fastapi import APIRouter

router = APIRouter(tags=["security"])

from .routes import security_index as security_index

__all__ = ["router"]
