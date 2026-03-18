from abc import ABC
from base64 import b64decode, b64encode
from typing import Self

from excalibur_server.src.auth.elliptic.curves import DECAF_GENERATOR, RISTRETTO_GENERATOR, Decaf448, Ristretto255
from excalibur_server.src.auth.elliptic.curves.abc import BaseCurve


class BaseECC(ABC):
    """
    Implementation of elliptic curve cryptography (ECC) operations.
    """

    Curve: type[BaseCurve] = None  # To be set by subclasses
    generator: BaseCurve = None  # To be set by subclasses

    def __init__(self, private_key_bytes: bytes = None):
        """
        Initializes a new ECC instance.

        :param curve: the elliptic curve class
        :param generator: the generator point
        :param private_key_bytes: the private key as bytes. If not provided, a secure random key is
            generated
        """

        # See RFC9497, section 3.2
        if private_key_bytes is None:
            scalar = self.Curve.random_scalar()

            self._private_key = scalar.to_bytes(self.Curve.KEY_LENGTH, byteorder="little")
            self._scalar = scalar
        else:
            if len(private_key_bytes) != self.Curve.KEY_LENGTH:
                raise ValueError(f"Private key must be exactly {self.Curve.KEY_LENGTH} bytes.")

            self._private_key = private_key_bytes
            self._scalar = int.from_bytes(private_key_bytes, byteorder="little") % self.Curve.ORDER

        self._public_key_point = self.generator * self._scalar

    @classmethod
    def from_key(cls, private_key: str) -> Self:
        """
        Creates a new instance from a private key.

        :param private_key: the private key as a base64 string
        :return: a new instance
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

    Curve = Ristretto255
    generator = RISTRETTO_GENERATOR


class Decaf448ECC(BaseECC):
    """
    Implementation of elliptic curve cryptography (ECC) operations using the Decaf448 curve from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    Curve = Decaf448
    generator = DECAF_GENERATOR
