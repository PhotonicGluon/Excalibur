from excalibur_server.src.crypto.elgamal import ElGamal
from excalibur_server.src.crypto.ristretto255 import Ristretto255

PRIV_KEY = 112358
PUB_KEY = PRIV_KEY * Ristretto255.GENERATOR
MESSAGE = 123456789 * Ristretto255.GENERATOR
CIPHERTEXT = bytes.fromhex(
    "6e96d004e9a414f9649c49d9d8d6f82acd18cf1f6683141a7a885d024092562a36284adc1f40512cf53e2a8988e57feae5ae06b75ca48af6722809d19695d956"
)


class TestElGamal:
    def test_encrypt(self):
        ciphertext = ElGamal.encrypt(PUB_KEY, MESSAGE, blind_scalar=1234)
        assert ciphertext == CIPHERTEXT

    def test_decrypt(self):
        m_recovered = ElGamal.decrypt(PRIV_KEY, CIPHERTEXT)
        assert MESSAGE == m_recovered
