from fastapi import Depends

from excalibur_server.api.v1.files.routes import router
from excalibur_server.api.v1.security.crypto.middleware import EncryptResponse


@router.get(
    "/",
    dependencies=[Depends(EncryptResponse())],
)
def files_index():
    return "YAY"
