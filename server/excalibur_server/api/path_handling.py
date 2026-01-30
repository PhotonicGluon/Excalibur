from base64 import b64decode
from typing import Annotated

from fastapi import Depends, Request

from excalibur_server.api.cache import MASTER_KEYS_CACHE
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.exef.exef import ExEF


def handle_path_param(param_value: str, credentials: Credentials) -> str:
    """
    Handles a possibly encrypted path parameter.

    :param param_value: value of the path parameter
    :param credentials: credentials of the user
    :returns: decrypted path parameter
    """

    if not credentials.encrypted:
        return param_value

    e2ee_key = MASTER_KEYS_CACHE.get(credentials.comm_uuid)
    raw_bytes = b64decode(param_value, altchars="-_")  # URL-safe Base64 character set
    return ExEF(e2ee_key).decrypt(raw_bytes).decode("utf-8")


def process_path_param(param_name: str):
    """
    A dependency that processes a possibly encrypted path parameter.

    :param param_name: name of the path parameter
    :returns: processed path parameter
    """

    def wrapper(
        request: Request,
        credentials: Annotated[Credentials, Depends(get_credentials)],
    ):
        raw_value = request.path_params[param_name]
        return handle_path_param(raw_value, credentials)

    return wrapper
