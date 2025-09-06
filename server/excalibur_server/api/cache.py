from cachetools import TTLCache

from excalibur_server.src.config import CONFIG

# TODO: Make these parameters use config
MASTER_KEYS_CACHE: dict[str, bytes] = TTLCache(maxsize=128, ttl=CONFIG.api.login_validity_time)
"Cache of master keys for UUIDs, used for authentication"
