from excalibur_server.src.crypto.exef import identify_version
from excalibur_server.src.crypto.exef.v4 import ExEFv4, HeaderV4

SUPPORTED_EXEF_VERSIONS = (3, 4)


# TODO: Support file pointers
def get_content_mac_input(exef_data: bytes) -> bytes:
    """
    Get the content MAC input for the given ExEF data.

    :param exef_data: the ExEF data to get the content MAC input for
    :raises ValueError: if the ExEF version is not supported
    :return: the content MAC input for the given ExEF data
    """

    version = identify_version(exef_data)
    if version not in SUPPORTED_EXEF_VERSIONS:
        raise ValueError(f"Unsupported ExEF version: {version}")

    if version == 3:
        return exef_data[:40] + exef_data[-16:]  # Header and footer of ExEFv3

    # Version 4
    header = HeaderV4.from_serialized(exef_data[: ExEFv4.header_size])
    chunk_count = header.chunk_count

    in_content = bytearray()
    for i in range(chunk_count):
        if i == chunk_count - 1:
            # Last chunk has the tag right at the end of the data
            in_content.extend(exef_data[-16:])
        else:
            # Other chunks have the tag at the end of the chunk
            offset = ExEFv4.header_size + i * (header.chunk_size + 16) + header.chunk_size
            in_content.extend(exef_data[offset : offset + 16])

    return bytes(in_content)
