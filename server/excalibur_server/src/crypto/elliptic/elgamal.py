from excalibur_server.src.crypto.elliptic.ristretto255 import Ristretto255


class ElGamal:
    @staticmethod
    def encrypt(public_key: Ristretto255, m: Ristretto255, blind_scalar: int | None = None) -> bytes:
        y = blind_scalar or Ristretto255.random_scalar()

        s = public_key * y
        c1 = y * Ristretto255.GENERATOR
        c2 = m + s

        return c1.to_bytes() + c2.to_bytes()

    @staticmethod
    def decrypt(private_key: int, ciphertext: bytes) -> Ristretto255:
        c1 = Ristretto255.from_bytes(ciphertext[: Ristretto255.KEY_LENGTH])
        c2 = Ristretto255.from_bytes(ciphertext[Ristretto255.KEY_LENGTH :])
        s = c1 * private_key
        m = c2 - s
        return m
