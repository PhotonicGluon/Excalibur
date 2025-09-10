from cachetools import TTLCache

from excalibur_server.src.config import CONFIG

MASTER_KEYS_CACHE: dict[str, bytes] = TTLCache(
    maxsize=CONFIG.security.e2ee.comm_cache_size, ttl=CONFIG.security.session_duration
)
"Cache of master keys for UUIDs, used for authentication"
POP_NONCE_CACHE: dict[bytes, bool] = TTLCache(
    maxsize=CONFIG.security.pop.nonce_cache_size, ttl=CONFIG.security.pop.timestamp_validity
)
"Cache of nonces for PoP validation"
