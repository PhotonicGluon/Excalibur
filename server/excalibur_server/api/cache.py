from cachetools import TTLCache

from excalibur_server.src.config import CONFIG

MASTER_KEYS_CACHE: dict[str, bytes] = TTLCache(
    maxsize=CONFIG.security.e2ee_comm_cache_size, ttl=CONFIG.security.login_validity_time
)
"Cache of master keys for UUIDs, used for authentication"
POP_NONCE_CACHE: dict[str, bool] = TTLCache(
    maxsize=CONFIG.security.pop_nonce_cache_size, ttl=CONFIG.security.login_validity_time
)
"Cache of nonces for PoP validation"
