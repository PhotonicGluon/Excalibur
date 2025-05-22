from fastapi import APIRouter, Depends
from excalibur_server.api.v1.security.auth import check_api_token

router = APIRouter(tags=["security"], dependencies=[Depends(check_api_token)])  # TODO: Update

from .routes import test_endpoint

__all__ = ["router"]
