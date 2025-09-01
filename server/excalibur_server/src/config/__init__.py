from pydantic import ValidationError

from .config import CONFIG_FILE, Config

try:
    CONFIG = Config()
except ValidationError as e:
    # Check if config file exists
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f"Config file not found at '{CONFIG_FILE}'. Did you initialize the server?")

    # Seems like the config file is missing fields
    raise e

__all__ = ["CONFIG"]
