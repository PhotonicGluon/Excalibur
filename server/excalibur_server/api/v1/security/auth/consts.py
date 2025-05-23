from Crypto.Random import get_random_bytes

from excalibur_server.api.misc import is_debug

KEYSIZE = 256  # In bits
if is_debug():
    KEY = b"one demo 16B key"
else:
    KEY = get_random_bytes(KEYSIZE // 8)
