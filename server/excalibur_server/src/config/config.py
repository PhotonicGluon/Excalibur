from pydantic import field_validator
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict, TomlConfigSettingsSource

from excalibur_server.consts import CONFIG_FILE
from excalibur_server.src.config.logging import Logging
from excalibur_server.src.config.security import Security
from excalibur_server.src.config.server import Server
from excalibur_server.src.config.storage import Storage

SETTINGS_VERSION = 1


class Config(BaseSettings):
    model_config = SettingsConfigDict(toml_file=CONFIG_FILE)
    version: int = SETTINGS_VERSION
    server: Server
    storage: Storage
    security: Security
    logging: Logging

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (TomlConfigSettingsSource(settings_cls),)

    # Validators
    @field_validator("version")
    def validate_version(cls, value: int) -> int:
        if value != SETTINGS_VERSION:
            raise ValueError(f"Config version mismatch: expected {SETTINGS_VERSION}, got {value}")
        return value
