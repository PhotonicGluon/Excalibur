import binascii
from base64 import b64decode
from typing import Annotated

from fastapi import Body, HTTPException, status

from excalibur_server.api.v1.security.consts import VERIFIER_FILE
from excalibur_server.api.v1.security.routes.srp import router


@router.post(
    "/enrol-verifier",
    summary="Enrol Verifier",
    response_model=str,
    responses={
        status.HTTP_409_CONFLICT: {"description": "Verifier already exists"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string for verifier"},
    },
)
def enrol_verifier_endpoint(verifier: Annotated[str, Body(description="Base64 string of the verifier to enrol.")]):
    """
    Endpoint that enrols the verifier.
    """

    if VERIFIER_FILE.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Verifier already exists")

    try:
        verifier = b64decode(verifier)
    except binascii.Error as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid base64 string for verifier: {e}"
        )

    with open(VERIFIER_FILE, "wb") as f:
        f.write(verifier)

    return "Verifier enrolled"
