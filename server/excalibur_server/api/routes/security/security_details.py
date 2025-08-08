import binascii
from base64 import b64decode
from typing import Annotated

from fastapi import Body, HTTPException, status
from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.security import router
from excalibur_server.src.security.security_details import (
    SecurityDetails,
    SecurityDetailsWithVerifier,
    check_security_details,
    get_security_details,
    set_security_details,
)


# TODO: Edit this endpoint
@router.head(
    "/details",
    summary="Check Security Details Existence",
    responses={
        status.HTTP_200_OK: {"description": "Security details file exists", "content": None},
        status.HTTP_404_NOT_FOUND: {"description": "Security details file not found"},
    },
)
def check_security_details_endpoint():
    """
    Endpoint that checks if the security details file exists.
    """

    if not check_security_details():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Security details file not found")

    return


@router.get(
    "/details",
    summary="Get Security Details",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Security details file not found"},
    },
    response_model=SecurityDetails,
)
def get_security_details_endpoint():
    """
    Endpoint that returns the security details.

    This does not return the verifier for the SRP handshake.
    """

    if not check_security_details():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Security details file not found")

    # Get raw security details
    security_details_with_verifier = get_security_details()

    # Return instance without the verifier
    return SecurityDetails.model_validate(security_details_with_verifier)


@router.post(
    "/details",
    summary="Set Security Details",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {
            "description": "Security details set",
            "content": {"text/plain": {"example": "Security details set", "schema": None}},
        },
        status.HTTP_409_CONFLICT: {"description": "Security details file already exists"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Invalid base64 string"},
    },
    response_class=PlainTextResponse,
)
def set_security_details_endpoint(
    auk_salt: Annotated[str, Body(description="Base64 string of the account unlock key (AUK) salt.")],
    srp_salt: Annotated[str, Body(description="Base64 string of the SRP handshake salt.")],
    verifier: Annotated[str, Body(description="Base64 string of the verifier to enrol.")],
):
    """
    Endpoint that enrols the verifier.
    """

    if check_security_details():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Security details file already exists")

    try:
        auk_salt = b64decode(auk_salt)
        srp_salt = b64decode(srp_salt)
        verifier = b64decode(verifier)
    except binascii.Error as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid base64 string: {e}")

    set_security_details(SecurityDetailsWithVerifier(auk_salt=auk_salt, srp_salt=srp_salt, verifier=verifier))
    return "Security details set"
