from Crypto.Random import get_random_bytes

from excalibur_server.api.misc import is_debug
from excalibur_server.src.security.srp import SRP, SRPGroup

LOGIN_VALIDITY_TIME = 3600  # 1 hour

SRP_HANDLER = SRP(SRPGroup.SMALL)

KEYSIZE = 256  # In bits
if is_debug():
    KEY = b"one demo 16B key"
else:
    KEY = get_random_bytes(KEYSIZE // 8)
