from base64 import b64decode, b64encode
from typing import Literal

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from pydantic import BaseModel


class EncryptedResponse(BaseModel):
    alg: Literal["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]
    nonce: str
    ciphertext: str
    tag: str


def encrypt(data: bytes, key: bytes, nonce: bytes = None) -> EncryptedResponse:
    """
    Encrypts the given data using AES encryption with GCM mode.

    :param data: The data to be encrypted, as bytes.
    :param key: The encryption key, as bytes.
    :return: An EncryptedResponse object containing the base64-encoded nonce, ciphertext, and tag.
    """

    if nonce is None:
        nonce = get_random_bytes(12)

    ciphertext, tag = AES.new(key, AES.MODE_GCM, nonce=nonce).encrypt_and_digest(data)
    return EncryptedResponse(
        alg=f"aes-{8 * len(key)}-gcm",
        nonce=b64encode(nonce).decode("UTF-8"),
        ciphertext=b64encode(ciphertext).decode("UTF-8"),
        tag=b64encode(tag).decode("UTF-8"),
    )


def decrypt(response: EncryptedResponse, master_key: bytes) -> bytes:
    """
    Decrypts the given data using AES encryption with GCM mode.

    :param response: An EncryptedResponse object containing the base64-encoded nonce, ciphertext, and tag.
    :param master_key: The encryption key, as bytes.
    :return: The decrypted data, as bytes.
    """

    return AES.new(master_key, AES.MODE_GCM, nonce=b64decode(response.nonce)).decrypt_and_verify(
        b64decode(response.ciphertext), b64decode(response.tag)
    )
