from excalibur_server.src.caches import PersistentTTLCache, TTLCache
from excalibur_server.src.config import CONFIG

MASTER_KEYS_CACHE: PersistentTTLCache[str, bytes] = PersistentTTLCache(
    maxsize=CONFIG.security.e2ee.comm_cache_size,
    ttl=CONFIG.security.session_duration,
    filename=CONFIG.security.e2ee.comm_cache_file,
)
"Cache of UUIDs to master keys for end-to-end encryption"
POP_NONCE_CACHE: TTLCache[bytes, bool] = TTLCache(
    maxsize=CONFIG.security.pop.nonce_cache_size, ttl=CONFIG.security.pop.timestamp_validity
)
"Cache of nonces for PoP validation"
