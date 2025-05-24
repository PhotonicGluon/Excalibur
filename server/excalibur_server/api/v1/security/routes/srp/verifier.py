import binascii
from base64 import b64decode
from typing import Annotated

from fastapi import Body, HTTPException, status

from excalibur_server.api.v1.security.consts import VERIFIER_FILE
from excalibur_server.api.v1.security.routes.srp import router


@router.head(
    "/verifier",
    summary="Check Verifier",
    responses={
        status.HTTP_200_OK: {"description": "Verifier exists"},
        status.HTTP_404_NOT_FOUND: {"description": "Verifier not found"},
    },
)
def check_verifier_endpoint():
    """
    Endpoint that checks if the verifier is enrolled.
    """

    if not VERIFIER_FILE.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verifier not found")

    return


@router.post(
    "/verifier",
    summary="Enrol Verifier",
    status_code=status.HTTP_201_CREATED,
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
