from abc import ABC
from base64 import b64decode, b64encode
from typing import Self

from excalibur_server.src.auth.elliptic.curves import DECAF_GENERATOR, RISTRETTO_GENERATOR, Decaf448, Ristretto255
from excalibur_server.src.auth.elliptic.curves.abc import BaseCurve


class BaseECC(ABC):
    """
    Implementation of elliptic curve cryptography (ECC) operations.
    """

    def __init__(self, cls: type[BaseCurve], generator: BaseCurve, private_key_bytes: bytes = None):
        """
        Initializes a new ECC instance.

        :param cls: the elliptic curve class
        :param generator: the generator point
        :param private_key_bytes: the private key as bytes, which must be 56 bytes long. If not
            provided, a secure random key is generated
        """

        if private_key_bytes is None:
            scalar = cls.random_scalar()

            self._private_key = scalar.to_bytes(56, byteorder="little")
            self._scalar = scalar
        else:
            if len(private_key_bytes) != 56:
                raise ValueError("Private key must be exactly 56 bytes.")

            self._private_key = private_key_bytes
            self._scalar = int.from_bytes(private_key_bytes, byteorder="little") % cls.ORDER

        # Generate the public key point per SEC 1, ver. 1.9, section 3.2.1
        self._public_key_point = generator * self._scalar

    @classmethod
    def from_key(cls, private_key: str) -> Self:
        """
        Creates a new Decaf448 instance from a private key.

        :param private_key: the private key as a base64 string
        :return: a new Decaf448 instance
        """

        private_key_bytes = b64decode(private_key)
        return cls(private_key=private_key_bytes)

    # Properties
    @property
    def private_key(self) -> str:
        """
        :return: the private key as a base64 string
        """

        return b64encode(self._private_key).decode("ascii")

    @property
    def public_key(self) -> str:
        """
        :return: the public key as a base64 string
        """

        pk_bytes = self._public_key_point.to_bytes()
        return b64encode(pk_bytes).decode("ascii")

    @property
    def keypair(self) -> tuple[str, str]:
        """
        :return: the private and public keys as a tuple of base64 strings
        """

        return self.private_key, self.public_key


class Ristretto255ECC(BaseECC):
    """
    Implementation of elliptic curve cryptography (ECC) operations using the Ristretto255 curve from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    def __init__(self, private_key_bytes: bytes = None):
        """
        Initializes a new Ristretto255 elliptic curve instance.

        :param private_key_bytes: the private key as bytes, which must be 56 bytes long. If not
            provided, a secure random key is generated
        """

        super().__init__(Ristretto255, RISTRETTO_GENERATOR, private_key_bytes)


class Decaf448ECC(BaseECC):
    """
    Implementation of elliptic curve cryptography (ECC) operations using the Decaf448 curve from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    def __init__(self, private_key_bytes: bytes = None):
        """
        Initializes a new Decaf448 elliptic curve instance.

        :param private_key_bytes: the private key as bytes, which must be 56 bytes long. If not
            provided, a secure random key is generated
        """

        super().__init__(Decaf448, DECAF_GENERATOR, private_key_bytes)
