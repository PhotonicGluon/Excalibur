from fastapi.responses import JSONResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.bip39.operation import to_mnemonic
from excalibur_server.src.config import CONFIG


@router.get("/ack", tags=["debug"], response_class=JSONResponse)
def get_account_creation_key():
    """
    Debug endpoint to get the account creation key.
    """

    return to_mnemonic(CONFIG.security.account_creation_key)
