from fastapi import APIRouter

router = APIRouter()

from .check_validity import check_srp_validity_endpoint
from .enrol_verifier import enrol_verifier_endpoint
from .group_establishment import establish_srp_group_endpoint
from .handshake import srp_handshake_endpoint

__all__ = ["router"]
