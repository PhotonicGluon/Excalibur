from base64 import b64encode


def serialize_bytes(a_bytes: bytes) -> str:
    """
    Encodes the given bytes as a base64-encoded string.

    :param a_bytes: The bytes to encode.
    :return: A base64-encoded string.
    """

    return b64encode(a_bytes).decode("utf-8")
