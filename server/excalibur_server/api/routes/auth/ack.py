from fastapi.responses import PlainTextResponse

from excalibur_server.api.routes.auth import router
from excalibur_server.src.config import CONFIG


@router.get("/ack", tags=["debug"], response_class=PlainTextResponse)
def get_account_creation_key():
    """
    Debug endpoint to get the account creation key.
    """

    return CONFIG.security.account_creation_key
