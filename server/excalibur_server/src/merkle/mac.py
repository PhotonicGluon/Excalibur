from io import SEEK_END, BytesIO
from typing import IO

from excalibur_server.src.crypto.exef import identify_version
from excalibur_server.src.crypto.exef.v4 import ExEFv4, HeaderV4

SUPPORTED_EXEF_VERSIONS = (3, 4)


def get_content_mac_input(exef_data: bytes | IO[bytes]) -> bytes:
    """
    Get the content MAC input for the given ExEF binary IO or raw ExEF data.

    :param exef_data: the ExEF data to get the content MAC input for
    :raises ValueError: if the ExEF version is not supported
    :return: the content MAC input for the given ExEF data
    """

    if isinstance(exef_data, bytes):
        exef_data: IO[bytes] = BytesIO(exef_data)

    exef_data.seek(0)
    version = identify_version(exef_data.read(5))

    if version not in SUPPORTED_EXEF_VERSIONS:
        raise ValueError(f"Unsupported ExEF version: {version}")

    exef_data.seek(0)
    if version == 3:
        # Just need header and footer
        header = exef_data.read(40)
        exef_data.seek(-16, SEEK_END)  # Seek 16 bytes from the back
        footer = exef_data.read(16)
        return header + footer

    # Version 4
    header = HeaderV4.from_serialized(exef_data.read(ExEFv4.header_size))
    chunk_count = header.chunk_count

    in_content = bytearray()
    for i in range(chunk_count):
        if i == chunk_count - 1:
            # Last chunk has the tag right at the end of the data
            exef_data.seek(-16, SEEK_END)
            in_content.extend(exef_data.read(16))
        else:
            # Other chunks have the tag at the end of the chunk
            offset = ExEFv4.header_size + i * (header.chunk_size + 16) + header.chunk_size
            exef_data.seek(offset)
            in_content.extend(exef_data.read(16))

    return bytes(in_content)
