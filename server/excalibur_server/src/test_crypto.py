from base64 import b64decode

import pytest

from .crypto import decrypt, encrypt

ALGORITHMS = ["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]
TEST_DATA = {
    "plaintext": [b"hello world foo bar"] * 3,
    "key": [b"1" * 16, b"1" * 24, b"1" * 32],
    "nonce": [b"one demo 12B"] * 3,
    "ciphertext": ["HUT7Wpg9GU/r4v9UzJGX/2ORpA==", "4VSXb4RkykkaCtO/LDK6d/gaPQ==", "ULS1EVfQ568dVIfyx09eUHcCmQ=="],
    "tag": ["60vQUfUmlasTofOiWARzjw==", "23cILL0C1tV3APGCjcR1Xw==", "U3syOuWcA4Ir7IAp18ZHig=="],
}


@pytest.mark.parametrize("algorithm", ALGORITHMS)
def test_crypto(algorithm: str):
    idx = ALGORITHMS.index(algorithm)

    plaintext = TEST_DATA["plaintext"][idx]
    key = TEST_DATA["key"][idx]
    nonce = TEST_DATA["nonce"][idx]
    ciphertext = TEST_DATA["ciphertext"][idx]
    tag = TEST_DATA["tag"][idx]

    exef = encrypt(plaintext, key, nonce)
    assert exef.alg == algorithm
    assert exef.nonce == nonce
    assert exef.ciphertext == b64decode(ciphertext)
    assert exef.tag == b64decode(tag)

    decrypted = decrypt(exef, key)
    assert decrypted == plaintext


def test_crypto_failures():
    with pytest.raises(ValueError):
        decrypt(encrypt(b"test", b"1" * 16, b"1" * 12), b"2" * 16)

    with pytest.raises(ValueError):
        encrypted_response = encrypt(b"test", b"1" * 16, b"1" * 12)
        encrypted_response.nonce = b"2" * 12
        decrypt(encrypted_response, b"1" * 16)

    with pytest.raises(ValueError):
        encrypted_response = encrypt(b"test", b"1" * 16, b"1" * 12)
        encrypted_response.tag = b"a" * 16
        decrypt(encrypted_response, b"1" * 16)
