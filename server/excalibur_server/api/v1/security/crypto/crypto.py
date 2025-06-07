from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

from excalibur_server.src.exef import ExEF


def encrypt(data: bytes, key: bytes, nonce: bytes = None) -> ExEF:
    """
    Encrypts the given data using AES encryption with GCM mode.

    :param data: The data to be encrypted, as bytes.
    :param key: The encryption key, as bytes.
    :return: The encrypted data, as an ExEF object.
    """

    if nonce is None:
        nonce = get_random_bytes(12)

    ciphertext, tag = AES.new(key, AES.MODE_GCM, nonce=nonce).encrypt_and_digest(data)
    return ExEF(keysize=len(key) * 8, nonce=nonce, tag=tag, ciphertext=ciphertext)


def decrypt(encrypted_data: ExEF, master_key: bytes) -> bytes:
    """
    Decrypts the given data using AES encryption with GCM mode.

    :param response: The data to be decrypted, as an ExEF object.
    :param master_key: The encryption key, as bytes.
    :return: The decrypted data, as bytes.
    """

    return AES.new(master_key, AES.MODE_GCM, nonce=encrypted_data.nonce).decrypt_and_verify(
        encrypted_data.ciphertext, encrypted_data.tag
    )
