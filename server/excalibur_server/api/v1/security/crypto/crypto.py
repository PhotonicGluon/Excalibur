from base64 import b64encode

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from pydantic import BaseModel


class EncryptedResponse(BaseModel):
    nonce: str
    ciphertext: str
    tag: str


def encrypt(data: bytes, key: bytes):
    """
    Encrypts the given data using AES encryption with GCM mode.

    :param data: The data to be encrypted, as bytes.
    :param key: The encryption key, as bytes.
    :return: An EncryptedResponse object containing the base64-encoded nonce, ciphertext, and tag.
    """

    nonce = get_random_bytes(16)
    ciphertext, tag = AES.new(key, AES.MODE_GCM, nonce=nonce).encrypt_and_digest(data)
    return EncryptedResponse(
        nonce=b64encode(nonce).decode("UTF-8"),
        ciphertext=b64encode(ciphertext).decode("UTF-8"),
        tag=b64encode(tag).decode("UTF-8"),
    )
