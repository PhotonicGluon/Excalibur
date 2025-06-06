from base64 import b64decode

import pytest

from .crypto import decrypt, encrypt

ALGORITHMS = ["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]
TEST_DATA = {
    "plaintext": [b"hello world foo bar"] * 3,
    "key": [b"1" * 16, b"1" * 24, b"1" * 32],
    "nonce": [b"one demo 16B val", b"one demo 24B val, oh wow", b"one demo 32B val, oh wow, oh my!"],
    "ciphertext": ["a49Y6bWynsEFTKEy7t/GVdeZbw==", "LlxwEapEAxEu6DCRou59v9ZCLg==", "DQIweslwGwPt1/RzOGng6kk3mw=="],
    "tag": ["8ZdhE+7NuFQoDmIbhxpKcw==", "+vp2LYHo48VwWTI0o1uOSg==", "nNUnGV/B05N/uM3rejAf0w=="],
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
