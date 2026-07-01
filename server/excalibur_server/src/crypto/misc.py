def i2osp(value: int, length: int) -> bytes:
    """
    Integer to octet string primitive (I2OSP) function described in RFC8017, section 4.1.

    :param value: integer to convert
    :param length: length of the output byte string
    :return: byte string
    """

    return value.to_bytes(length, "big")


def xor(s1: bytes, s2: bytes) -> bytes:
    """
    XOR two byte strings.

    :param s1: first byte string
    :param s2: second byte string
    :return: XORed byte string
    """

    return bytes(a ^ b for a, b in zip(s1, s2))
