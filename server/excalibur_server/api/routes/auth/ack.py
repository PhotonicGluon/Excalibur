from typing import Annotated

from fastapi import Query
from fastapi.responses import JSONResponse, PlainTextResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.bip39.operation import to_mnemonic
from excalibur_server.src.config import CONFIG


@router.get("/ack", tags=["debug"], response_class=JSONResponse)
def get_account_creation_key(
    as_string: Annotated[bool, Query(description="Whether to return the ACK as a string")] = False,
):
    """
    Debug endpoint to get the account creation key (ACK).
    """

    mnemonic = to_mnemonic(CONFIG.security.account_creation_key)

    if as_string:
        return PlainTextResponse(" ".join(mnemonic))

    return mnemonic
