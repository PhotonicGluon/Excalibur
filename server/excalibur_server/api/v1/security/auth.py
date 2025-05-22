import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from jwt.exceptions import InvalidTokenError

from excalibur_server.api.v1.security.consts import KEY

api_token_header = APIKeyHeader(name="X-API-Token")

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def check_api_token(token: str = Security(api_token_header)) -> bool:
    """
    Checks the validity of the API key provided and returns a user if valid.
    """

    try:
        token = jwt.decode(token, KEY, algorithms=["HS256"])
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid API key")

    return True
