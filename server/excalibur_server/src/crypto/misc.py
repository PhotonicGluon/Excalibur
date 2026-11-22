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


def frame(*parts: bytes, prefix_len: int = 4) -> bytes:
    """
    Length prefix each part and concatenate them.

    :param parts: parts to concatenate
    :param prefix_len: length of the prefix in bytes
    :return: length prefixed concatenation of bytes
    """

    return b"".join([(len(p).to_bytes(prefix_len, "big")) + p for p in parts])
