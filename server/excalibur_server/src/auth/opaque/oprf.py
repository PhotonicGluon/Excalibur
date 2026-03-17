from hashlib import shake_256

from excalibur_server.src.auth.opaque.elliptic import Decaf448


class OPRF:
    """
    An Oblivious Pseudo-Random Function (OPRF) implementation based on
    [RFC9497](https://www.rfc-editor.org/rfc/rfc9497) upon the elliptic curve Decaf448.
    """

    CONTEXT_STRING = b"OPRFV1-\x00-decaf448-SHAKE256"  # See section 3.1 for main format and 4.2 for identifier

    # Helper methods
    @staticmethod
    def _i2osp(value: int, length: int) -> bytes:
        """
        Integer to octet string primitive (I2OSP) function described in RFC8017, section 4.1.

        :param value: integer to convert
        :param length: length of the output byte string
        :return: byte string
        """

        return value.to_bytes(length, "big")

    @staticmethod
    def _expand_message_xof(msg: bytes, dst: bytes, len_in_bytes: int) -> bytes:
        """
        Implements the `expand_message_xof()` function in RFC9380, section 5.3.2.

        :param msg: a byte string
        :param dst: a byte string of at most 255 bytes
        :param len_in_bytes: the length of the requested output in bytes
        :return: a byte string of length `len_in_bytes`
        """

        if len_in_bytes > 65535 or len(dst) > 255:
            raise ValueError("length or destination too long")

        dst_prime = dst + OPRF._i2osp(len(dst), 1)
        msg_prime = msg + OPRF._i2osp(len_in_bytes, 2) + dst_prime
        uniform_bytes = shake_256(msg_prime).digest(len_in_bytes)
        return uniform_bytes

    @staticmethod
    def _hash_to_decaf448(msg: bytes, dst: bytes) -> Decaf448:
        """
        Implements the `hash_to_decaf448()` function described in RFC9380, appendix C.

        :param msg: a byte string
        :param dst: a byte string of at most 255 bytes
        :return: a point on the Decaf448 curve
        """

        uniform_bytes = OPRF._expand_message_xof(msg, dst, 112)
        pt = Decaf448.derive(uniform_bytes)
        return pt

    @staticmethod
    def _hash_to_group(msg: bytes) -> Decaf448:
        """
        Implements the `HashToGroup()` function described in RFC9497, section 4.2.

        :param msg: a byte string
        :return: a point on the Decaf448 curve
        """

        return OPRF._hash_to_decaf448(msg, b"HashToGroup-" + OPRF.CONTEXT_STRING)

    # Public methods
    @staticmethod
    def blind(input: bytes, blind: int | None = None) -> tuple[int, Decaf448]:
        """
        The client `Blind()` function as described in RFC9497, section 3.1.1.

        :param input: a byte string
        :param blind: a blinding factor from GF(P). If None, a random one will be generated
        :return: a tuple, where the first represents the "blinding scalar" and the second represents
            the "blinded element"
        :raises ValueError: if the input element is the identity
        """

        blind = blind or Decaf448.random_scalar()
        input_element = OPRF._hash_to_group(input)

        if input_element.is_identity():
            raise ValueError("input element is identity")

        blinded_element = blind * input_element

        return blind, blinded_element

    @staticmethod
    def blind_evaluate(sk_scalar: int, blinded_element: Decaf448) -> Decaf448:
        """
        The server `BlindEvaluate()` function as described in RFC9497, section 3.1.1.

        :param sk_scalar: the server's secret key, as a scalar in GF(P)
        :param blinded_element: the blinded element
        :return: the evaluated element
        """

        return sk_scalar * blinded_element

    @staticmethod
    def finalize(input: bytes, blind: int, evaluated_element: Decaf448) -> bytes:
        """
        The client `Finalize()` function as described in RFC9497, section 3.1.1.

        :param input: a byte string
        :param blind: the blinding scalar
        :param evaluated_element: the evaluated element
        :return: a byte string
        """

        unblinded_element = Decaf448.scalar_inverse(blind) * evaluated_element
        unblinded_element_bytes = unblinded_element.to_bytes()

        hash_input = (
            OPRF._i2osp(len(input), 2)
            + input
            + OPRF._i2osp(len(unblinded_element_bytes), 2)
            + unblinded_element_bytes
            + b"Finalize"
        )
        return shake_256(hash_input).digest(64)
