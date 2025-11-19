import os
from datetime import datetime, timezone
from typing import Annotated, Callable

from fastapi import Header, HTTPException, Query, Request, Security, WebSocket, WebSocketException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from excalibur_server.api.cache import MASTER_KEYS_CACHE, POP_NONCE_CACHE
from excalibur_server.src.auth.consts import KEY
from excalibur_server.src.auth.pop import POP_HEADER_PATTERN, generate_pop, parse_pop_header
from excalibur_server.src.config import CONFIG
from excalibur_server.src.url import get_url_encoded_path

from .jwt import decode_token, generate_token

API_TOKEN_HEADER = HTTPBearer(scheme_name="SRP-Identity", auto_error=False)


def generate_auth_token(username: str, comm_uuid: str, expiry_timestamp: float) -> str:
    """
    Generates a JWT token for the given E2EE key and expiry timestamp.

    :param username: the username
    :param comm_uuid: the UUID of the communication session
    :param expiry_timestamp: the timestamp when the token expires
    :return: a serialized JWT
    """

    return generate_token(
        sub=username,
        data={"uuid": comm_uuid},
        key=KEY,
        expiry=int(round(expiry_timestamp - datetime.now(tz=timezone.utc).timestamp())),
    )


def check_auth_token(token: str) -> bool:
    """
    Checks the validity of the auth token.

    :param token: the auth token
    :return: True if credentials are valid and False otherwise
    """

    decoded = decode_token(token, KEY)
    if decoded is None:
        return False

    comm_uuid = decoded.pop("uuid")
    if comm_uuid not in MASTER_KEYS_CACHE:
        return False

    return True


class Credentials(BaseModel):
    """
    The credentials of a user.
    """

    username: str
    comm_uuid: str


async def _verify_and_extract_credentials(
    get_path_and_method: Callable[[], tuple[str, str]],
    raise_exception: Callable[[str], None],
    credentials: HTTPAuthorizationCredentials | None,
    hmac_validation: str,
) -> Credentials:
    """
    Core logic to validate credentials for both HTTP and WebSocket.

    :param get_path_and_method: a function that returns the encoded path and method
    :param raise_exception: a function to call to raise context-specific exceptions
    :param credentials: the "Bearer" token credentials
    :param hmac_validation: the X-SRP-PoP header value
    :return: the validated credentials
    """

    if not credentials:
        raise raise_exception("Missing, invalid, or expired bearer token")

    # Check if the provided identity token is valid
    decoded = decode_token(credentials.credentials, KEY)
    if decoded is None:
        raise raise_exception("Missing, invalid, or expired bearer token")
    sub = decoded["sub"]
    comm_uuid = decoded["uuid"]

    if comm_uuid not in MASTER_KEYS_CACHE:
        raise raise_exception("Missing, invalid, or expired bearer token")

    if os.getenv("EXCALIBUR_SERVER_POP_ENABLED", "true") != "true":
        # No need to proceed to check header
        return Credentials(username=sub, comm_uuid=comm_uuid)

    # Check that the header is valid
    if not hmac_validation:
        raise raise_exception("Missing PoP")

    timestamp, nonce, hmac = parse_pop_header(hmac_validation)

    # Check if timestamp is within acceptable range
    if timestamp < datetime.now(tz=timezone.utc).timestamp() - CONFIG.security.pop.timestamp_validity:
        raise raise_exception("Invalid timestamp")

    # Check if nonce is fresh
    if nonce in POP_NONCE_CACHE:
        raise raise_exception("Nonce reused")

    # Add nonce to cache of known nonces
    POP_NONCE_CACHE[nonce] = True

    # Extract parts needed for the SRP Proof of Possession (PoP)
    master_key = MASTER_KEYS_CACHE[comm_uuid]
    path, method = get_path_and_method()

    # Check if the SRP PoP is valid
    hmac_computed = generate_pop(master_key, method, path, timestamp, nonce)
    if hmac_computed != hmac:
        raise raise_exception("Invalid PoP")

    return Credentials(username=sub, comm_uuid=comm_uuid)


async def get_credentials(
    request: Request,
    hmac_validation: Annotated[
        str,
        Header(
            alias="X-SRP-PoP",
            pattern=POP_HEADER_PATTERN,
            description="HMAC for authentication.",
        ),
    ] = "",
    credentials: HTTPAuthorizationCredentials | None = Security(API_TOKEN_HEADER),
) -> Credentials:
    """
    HTTP-specific method that gets the authorization credentials.

    :param request: the request
    :param hmac_validation: the SRP HMAC
    :param credentials: authorization credentials included as the "Bearer" header
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: the credentials
    """

    def get_path_and_method() -> tuple[str, str]:
        return get_url_encoded_path(request.url), request.method

    def raise_http_exception(detail: str):
        headers = {"WWW-Authenticate": "Bearer", "X-SRP-PoP": POP_HEADER_PATTERN}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers=headers if detail in ["Missing PoP", "Invalid timestamp", "Nonce reused"] else None,
        )

    return await _verify_and_extract_credentials(
        get_path_and_method=get_path_and_method,
        raise_exception=raise_http_exception,
        credentials=credentials,
        hmac_validation=hmac_validation,
    )


async def get_credentials_ws(
    websocket: WebSocket,
    auth_token: Annotated[str, Query(description="Authorization token")],
    hmac_validation: Annotated[
        str,
        Query(
            pattern=POP_HEADER_PATTERN,
            description="HMAC for authentication",
        ),
    ] = "",
) -> Credentials:
    """
    WebSocket-specific method that gets the authorization credentials.

    :param websocket: the WebSocket
    :param auth_token: authorization credentials
    :param hmac_validation: the SRP HMAC
    :raises CREDENTIALS_EXCEPTION: if the token is missing or invalid
    :return: the credentials
    """

    def get_path_and_method() -> tuple[str, str]:
        return get_url_encoded_path(websocket.url), "WEBSOCKET"

    def raise_ws_exception(reason: str):
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=reason,
        )

    try:
        return await _verify_and_extract_credentials(
            get_path_and_method=get_path_and_method,
            raise_exception=raise_ws_exception,
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth_token.removeprefix("Bearer ")),
            hmac_validation=hmac_validation,
        )
    except HTTPException:
        # Catch generic credential exceptions and convert to WebSocketException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing, invalid, or expired bearer token"
        )
