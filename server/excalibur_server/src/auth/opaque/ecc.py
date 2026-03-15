from Crypto.PublicKey import ECC


class Curve25519:
    def __init__(self):
        """
        Initializes a new Curve25519 instance.
        """

        self._curve = ECC.generate(curve="Curve25519")

    @classmethod
    def from_key(cls, private_key: str) -> "Curve25519":
        """
        Creates a new Curve25519 instance from a private key.
        """

        key_str = f"-----BEGIN PRIVATE KEY-----\n{private_key}\n-----END PRIVATE KEY-----"

        curve = ECC.import_key(key_str)
        instance = cls()
        instance._curve = curve
        return instance

    @property
    def private_key(self) -> str:
        """
        :return: the private key as a string without the PEM headers and footers.
        """

        key_str = self._curve.export_key(format="PEM")
        return key_str.removeprefix("-----BEGIN PRIVATE KEY-----\n").removesuffix("\n-----END PRIVATE KEY-----")

    @property
    def public_key(self) -> str:
        """
        :return: the public key as a string without the PEM headers and footers.
        """

        key_str = self._curve.public_key().export_key(format="PEM")
        return key_str.removeprefix("-----BEGIN PUBLIC KEY-----\n").removesuffix("\n-----END PUBLIC KEY-----")

    @property
    def keypair(self) -> tuple[str, str]:
        """
        :return: the private and public keys as a tuple of strings without the PEM headers and footers.
        """
        return self.private_key, self.public_key


if __name__ == "__main__":
    curve = Curve25519()
    print(curve.private_key)
    print(curve.public_key)
    print(curve.keypair)
