from abc import ABC
from hashlib import sha512
from math import ceil
from typing import Any, Callable, Literal

from excalibur_server.src.auth.opaque.misc import i2osp, xor
from excalibur_server.src.crypto.ristretto255 import Ristretto255


class BaseOPRFRistretto(ABC):
    """
    Base class for an Oblivious Pseudo-Random Function (OPRF) implementation using the Ristretto255
    curve based on [RFC9497](https://datatracker.ietf.org/doc/html/rfc9497).
    """

    # To be overridden by subclasses
    hashfunc: Callable[[bytes], Any] = None  # To be overridden by subclasses
    CONTEXT_STRING: bytes = b""

    # Helper methods

    @classmethod
    def _expand_message_xmd(cls, msg: bytes, dst: bytes, len_in_bytes: int) -> bytes:
        """
        Implements the `expand_message_xmd()` function in RFC9380, section 5.3.1.

        Call this if the class uses an XMD hash function.

        :param msg: a byte string
        :param dst: a byte string of at most 255 bytes
        :param len_in_bytes: the length of the requested output in bytes
        :return: a byte string of length `len_in_bytes`
        :raises ValueError: if the length or destination is too long
        """

        ell = ceil(len_in_bytes / 64)
        dst_prime = dst + i2osp(len(dst), 1)

        zero_pad = i2osp(0, 128)
        l_i_b_str = i2osp(len_in_bytes, 2)
        msg_prime = zero_pad + msg + l_i_b_str + i2osp(0, 1) + dst_prime

        b_0 = cls.hashfunc(msg_prime).digest()

        b = [None] * (ell + 1)  # Preallocate array
        b[1] = cls.hashfunc(b_0 + i2osp(1, 1) + dst_prime).digest()

        for i in range(2, ell + 1):
            b[i] = cls.hashfunc(xor(b[i - 1], b_0) + i2osp(i, 1) + dst_prime).digest()

        uniform_bytes = b"".join(b[1 : ell + 1])
        return uniform_bytes[:len_in_bytes]

    @classmethod
    def _hash_to_ristretto255(cls, msg: bytes, dst: bytes) -> Ristretto255:
        """
        Implements the `hash_to_ristretto255()` function described in RFC9380, appendix B.

        :param msg: a byte string
        :param dst: a byte string of at most 255 bytes
        :return: a point on the Ristretto255 curve
        """

        uniform_bytes = cls._expand_message_xmd(msg, dst, 64)
        pt = Ristretto255.derive(uniform_bytes)
        return pt

    @classmethod
    def _hash_to_scalar(cls, msg: bytes, dst: bytes | None = None) -> int:
        """
        Implements the `HashToScalar()` function described in RFC9497, section 4.1.

        :param msg: a byte string
        :param dst: an optional byte string of at most 255 bytes
        :return: a scalar
        """

        dst = dst or b"HashToScalar-" + cls.CONTEXT_STRING
        uniform_bytes = cls._expand_message_xmd(msg, dst, 64)
        return int.from_bytes(uniform_bytes, byteorder="little") % Ristretto255.ORDER

    @classmethod
    def _hash_to_group(cls, msg: bytes, dst: bytes | None = None) -> Ristretto255:
        """
        Implements the `HashToGroup()` function described in RFC9497, section 4.1.

        :param msg: a byte string
        :param dst: an optional byte string of at most 255 bytes
        :return: a curve point
        """

        dst = dst or b"HashToGroup-" + cls.CONTEXT_STRING
        return cls._hash_to_ristretto255(msg, dst)

    # Public methods
    @classmethod
    def generate_keys(
        cls, seed: bytes = b"", info: bytes = b"", for_export: bool = False
    ) -> tuple[int, Ristretto255] | tuple[bytes, bytes]:
        """
        Generates a public-private key pair, following RFC9497 section 3.2 (and 3.2.1).

        :param seed: a byte string used as a seed for key generation
        :param info: additional information to include in the key generation process
        :param for_export: whether the keys are being generated for export (i.e. they will be
            converted into bytes)
        :return: a tuple of (private_key, public_key)
        """

        if not seed:
            # See RFC9497, section 3.2
            private_key = Ristretto255.random_scalar()
        else:
            # See RFC9497, section 3.2.1
            derive_input = seed + i2osp(len(info), 2) + info
            counter = 0
            private_key = 0
            while private_key == 0:
                if counter > 255:
                    raise RuntimeError("unable to generate private key")
                private_key = cls._hash_to_scalar(
                    derive_input + i2osp(counter, 1), dst=b"DeriveKeyPair" + cls.CONTEXT_STRING
                )
                counter += 1

        public_key = Ristretto255.GENERATOR * private_key

        if for_export:
            private_key_bytes = private_key.to_bytes(Ristretto255.KEY_LENGTH, byteorder="little")
            public_key_bytes = public_key.to_bytes()
            return private_key_bytes, public_key_bytes

        return private_key, public_key

    @classmethod
    def blind(cls, input: bytes, blind: int | None = None) -> tuple[int, Ristretto255]:
        """
        The client `Blind()` function as described in RFC9497, section 3.1.1.

        :param input: a byte string
        :param blind: a blinding factor from GF(P). If None, a random one will be generated
        :return: a tuple, where the first represents the "blinding scalar" and the second represents
            the "blinded element"
        :raises ValueError: if the input element is the identity
        """

        blind = blind or Ristretto255.random_scalar()
        input_element = cls._hash_to_group(input)

        if input_element.is_identity():
            raise ValueError("input element is identity")

        blinded_element = blind * input_element
        return blind, blinded_element

    @staticmethod
    def blind_evaluate(sk_scalar: int, blinded_element: Ristretto255) -> Ristretto255:
        """
        The server `BlindEvaluate()` function as described in RFC9497, section 3.1.1.

        :param sk_scalar: the server's secret key, as a scalar in GF(P)
        :param blinded_element: the blinded element
        :return: the evaluated element
        """

        return sk_scalar * blinded_element

    @classmethod
    def finalize(cls, input: bytes, blind: int, evaluated_element: Ristretto255) -> bytes:
        """
        The client `Finalize()` function as described in RFC9497, section 3.1.1.

        :param input: a byte string
        :param blind: the blinding scalar
        :param evaluated_element: the evaluated element
        :return: a byte string
        """

        unblinded_element = Ristretto255.scalar_inverse(blind) * evaluated_element
        unblinded_element_bytes = unblinded_element.to_bytes()

        hash_input = (
            i2osp(len(input), 2)
            + input
            + i2osp(len(unblinded_element_bytes), 2)
            + unblinded_element_bytes
            + b"Finalize"
        )

        return cls.hashfunc(hash_input).digest()


class OPRFRistrettoSHA512(BaseOPRFRistretto):
    """
    The `OPRF(ristretto255, SHA-512)` implementation based on
    [RFC9497](https://datatracker.ietf.org/doc/html/rfc9497).
    """

    hashfunc = sha512
    CONTEXT_STRING = b"OPRFV1-\x00-ristretto255-SHA512"  # See section 3.1 for main format and 4.1 for identifier


OPRFType = Literal["ristretto255-sha512"]
