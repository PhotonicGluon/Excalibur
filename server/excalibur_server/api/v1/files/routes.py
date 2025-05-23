from fastapi import APIRouter, Depends, status
from excalibur_server.api.v1.security.auth import check_credentials

router = APIRouter(
    tags=["security"],
    dependencies=[Depends(check_credentials)],
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Unauthorized"}},
)  # TODO: Update


__all__ = ["router"]


# TODO: Add


@router.get("/test-endpoint")
def test_endpoint():
    return "YAY"
