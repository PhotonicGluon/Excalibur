from base64 import b64decode
from typing import Annotated

from fastapi import Depends, Request

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.exef.exef import ExEF


def handle_path_param(param: str, credentials: Credentials) -> str:
    if not credentials.encrypted:
        return param

    e2ee_key = MASTER_KEYS_CACHE.get(credentials.comm_uuid)
    raw_bytes = b64decode(param, altchars="-_")  # URL-safe Base64 character set
    return ExEF(e2ee_key).decrypt(raw_bytes).decode("utf-8")


def process_path_param(param_name: str):
    def wrapper(
        request: Request,
        credentials: Annotated[Credentials, Depends(get_credentials)],
    ):
        raw_value = request.path_params[param_name]
        return handle_path_param(raw_value, credentials)

    return wrapper
