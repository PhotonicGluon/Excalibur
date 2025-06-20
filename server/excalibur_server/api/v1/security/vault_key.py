import json
from base64 import b64decode
from datetime import datetime
from pathlib import Path
from typing import ClassVar

from pydantic import BaseModel, field_serializer

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.utils import serialize_bytes

VAULT_KEY_FILE = ROOT_FOLDER / "vault.key"


class EncryptedVaultKey(BaseModel):
    version: ClassVar[int] = 1

    timestamp: int
    key_enc: bytes  # Encrypted vault key as an ExEF stream

    @field_serializer("key_enc")
    def serialize_encryption_stuff(self, a_bytes: bytes, _info) -> str:
        return serialize_bytes(a_bytes)

    @classmethod
    def from_serialized(cls, obj: dict[str, str]) -> "EncryptedVaultKey":
        assert "timestamp" in obj and "key_enc" in obj
        return EncryptedVaultKey(
            timestamp=int(obj["timestamp"]),
            key_enc=b64decode(obj["key_enc"]),
        )


def check_vault_key(vault_key_file: Path = VAULT_KEY_FILE) -> bool:
    """
    Checks if the vault key file exists.

    :param vault_key_file: The file to check. Defaults to VAULT_KEY_FILE
    :return: True if the file exists
    """

    return vault_key_file.exists()


def get_vault_key(vault_key_file: Path = VAULT_KEY_FILE) -> EncryptedVaultKey:
    """
    Reads the vault key details from the given file.

    :param vault_key_file: The file to read from. Defaults to VAULT_KEY_FILE
    :return: The read vault key details
    """

    with open(vault_key_file, "r") as f:
        return EncryptedVaultKey.from_serialized(json.loads(f.read()))


def set_vault_key(key_enc: bytes, vault_key_file: Path = VAULT_KEY_FILE):
    """
    Writes the given vault key details to the given file.

    :param key_enc: The vault key as an ExEF stream
    :param vault_key_file: The file to write to, defaults to VAULT_KEY_FILE
    """

    encrypted_vault_key = EncryptedVaultKey(timestamp=int(datetime.now().timestamp()), key_enc=key_enc)
    with open(vault_key_file, "w") as f:
        f.write(encrypted_vault_key.model_dump_json())
