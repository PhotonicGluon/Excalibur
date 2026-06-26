from Crypto.Random import get_random_bytes

from excalibur_server.api.logging import logger
from excalibur_server.env import is_debug

KEYSIZE = 256  # In bits
KEY = get_random_bytes(KEYSIZE // 8)

if is_debug():
    logger.info(f"JWT/PoP server key: {KEY.hex()}")
