from cachetools import TTLCache

from excalibur_server.api.v1.security.consts import LOGIN_VALIDITY_TIME, SRP_HANDSHAKE_CACHE_SIZE, SRP_HANDSHAKE_TIME

HANDSHAKE_CACHE: TTLCache[str, str] = TTLCache(maxsize=SRP_HANDSHAKE_CACHE_SIZE, ttl=SRP_HANDSHAKE_TIME)
VALID_UUIDS_CACHE: TTLCache[str, tuple[str, float]] = TTLCache(
    maxsize=SRP_HANDSHAKE_CACHE_SIZE, ttl=LOGIN_VALIDITY_TIME
)
