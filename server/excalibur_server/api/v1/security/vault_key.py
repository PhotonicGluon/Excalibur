import json
from base64 import b64decode
from pathlib import Path

from pydantic import BaseModel, field_serializer

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.utils import serialize_bytes

VAULT_KEY_FILE = ROOT_FOLDER / "vault.key"


class EncryptedVaultKey(BaseModel):
    alg: str
    nonce: bytes
    key_enc: bytes  # Key, encrypted
    tag: bytes

    @field_serializer("nonce", "key_enc", "tag")
    def serialize_encryption_stuff(self, a_bytes: bytes, _info) -> str:
        return serialize_bytes(a_bytes)

    @classmethod
    def from_base64s(cls, obj: dict[str, str]) -> "EncryptedVaultKey":
        assert "alg" in obj and "nonce" in obj and "key_enc" in obj and "tag" in obj
        return EncryptedVaultKey(
            alg=obj["alg"],
            nonce=b64decode(obj["nonce"]),
            key_enc=b64decode(obj["key_enc"]),
            tag=b64decode(obj["tag"]),
        )


def get_vault_key(vault_key_file: Path = VAULT_KEY_FILE) -> EncryptedVaultKey:
    """
    Reads the vault key details from the given file.

    :param vault_key_file: The file to read from. Defaults to VAULT_KEY_FILE
    :return: The read vault key details
    """

    with open(vault_key_file, "r") as f:
        return EncryptedVaultKey.from_base64s(json.loads(f.read()))


def set_vault_key(encrypted_vault_key: EncryptedVaultKey, vault_key_file: Path = VAULT_KEY_FILE):
    """
    Writes the given vault key details to the given file.

    :param encrypted_vault_key: The vault key details to write.
    :param vault_key_file: The file to write to, defaults to VAULT_KEY_FILE
    """

    with open(vault_key_file, "w") as f:
        f.write(encrypted_vault_key.model_dump_json())
