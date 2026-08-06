from typing import ClassVar, Literal

from pydantic import BaseModel, model_serializer

from excalibur_server.src.crypto.consts import MAX_UINT32, MAX_UINT64
from excalibur_server.src.crypto.exef.padme import PADME

EXEF_VERSION = 4

# Framing constants
HEADER_SIZE = 56
SALT_SIZE = 32
TAG_SIZE = 16
LENGTH_PREFIX_SIZE = 8

# Chunk size exponent bounds (inclusive)
MIN_EXPONENT = 4  # 16 bytes
MAX_EXPONENT = 30  # 1 GiB
DEFAULT_EXPONENT = 16  # 64 KiB

# Chunk count bounds
MIN_CHUNK_COUNT = 1
MAX_CHUNK_COUNT = MAX_UINT32

# Mapping of cipher ID to key size, in bytes
_CIPHER_ID_TO_KEY_SIZE: dict[int, int] = {1: 16, 2: 24, 3: 32}
_KEY_SIZE_TO_CIPHER_ID: dict[int, int] = {size: cid for cid, size in _CIPHER_ID_TO_KEY_SIZE.items()}


def cipher_id_for_key_size(key_size: int) -> Literal[1, 2, 3]:
    """
    Returns the cipher ID for a given key size.

    :param key_size: the key size, in bytes (16, 24, or 32)
    :raises ValueError: if the key size is not supported
    :return: the corresponding cipher ID
    """

    if key_size not in _KEY_SIZE_TO_CIPHER_ID:
        raise ValueError("keysize must be 128, 192, or 256")
    return _KEY_SIZE_TO_CIPHER_ID[key_size]


def compute_chunk_count(padded_size: int, chunk_size: int) -> int:
    """
    Computes the number of chunks for a given padded size and chunk size.

    :param padded_size: the padded size, in bytes
    :param chunk_size: the chunk size, in bytes
    :return: the number of chunks, i.e. `ceil(padded_size / chunk_size)`
    """

    return (padded_size + chunk_size - 1) // chunk_size


def compute_padded_size(length: int) -> int:
    """
    Computes the padded size for a plaintext of `length` bytes.

    :param length: the plaintext length, in bytes
    :return: the padded size, i.e. `8 + PADME(length)`
    """

    return LENGTH_PREFIX_SIZE + PADME.compute_padded_length(length)


def compute_encrypted_size(length: int, exponent: int = DEFAULT_EXPONENT) -> int:
    """
    Computes the total size of an ExEF v4 file for a plaintext of `length` bytes.

    :param length: the plaintext length, in bytes
    :param exponent: the chunk size exponent, defaults to :data:`DEFAULT_EXPONENT`
    :return: the total encrypted size, i.e. `header + padded size + tags`
    """

    padded_size = compute_padded_size(length)
    n = compute_chunk_count(padded_size, 1 << exponent)
    return HEADER_SIZE + padded_size + TAG_SIZE * n


def nonce(index: int) -> bytes:
    """
    Builds the 12-byte AES-GCM nonce for the chunk at the given index.

    :param index: the 0-based chunk index
    :return: the nonce
    """

    return b"\x00" * 8 + index.to_bytes(4, "big")


def aad(header: bytes, index: int, is_final: bool) -> bytes:
    """
    Builds the additional authenticated data for the chunk at the given index.

    :param header: the complete 56-byte header
    :param index: the 0-based chunk index
    :param is_final: whether this is the final chunk
    :return: the additional authenticated data
    """

    return header + index.to_bytes(4, "big") + (b"\x01" if is_final else b"\x00")


def _validate_structural(exponent: int, chunk_count: int, padded_size: int) -> None:
    """
    Runs the ExEF v4 structural header checks in the order mandated by the specification.

    :param exponent: the chunk size exponent
    :param chunk_count: the declared chunk count
    :param padded_size: the declared padded size
    :raises ValueError: on the first check that fails
    """

    if not (MIN_EXPONENT <= exponent <= MAX_EXPONENT):
        raise ValueError(f"exponent must be between {MIN_EXPONENT} and {MAX_EXPONENT}")

    if not (LENGTH_PREFIX_SIZE <= padded_size <= MAX_UINT64):
        raise ValueError("padded size out of range")

    if not PADME.is_fixed_point(padded_size - LENGTH_PREFIX_SIZE):
        raise ValueError("padded size is not a valid PADME output")

    if chunk_count < MIN_CHUNK_COUNT:
        raise ValueError("chunk count must be at least 1")

    if chunk_count != compute_chunk_count(padded_size, 1 << exponent):
        raise ValueError("chunk count does not match padded size")


class Header(BaseModel):
    """
    ExEF v4 header.
    """

    size: ClassVar[int] = HEADER_SIZE
    """Size of the ExEF header, in bytes"""

    cipher_id: Literal[1, 2, 3]
    """ID of the cipher suite used for encryption"""
    exponent: int
    """Base-2 exponent of the plaintext chunk size"""
    chunk_count: int
    """Number of chunks in the body"""
    padded_size: int
    """Total number of plaintext bytes across all chunks (length prefix + plaintext + padding)"""
    salt: bytes
    """32-byte HKDF salt"""
    reserved: bytes = b"\x00" * 5
    """5 reserved bytes; must be zero"""

    @model_serializer
    def serialize_as_bytes(self) -> bytes:
        """
        Generates the ExEF v4 header.
        """

        output = b"ExEF"
        output += EXEF_VERSION.to_bytes(1, "big")
        output += self.cipher_id.to_bytes(1, "big")
        output += self.exponent.to_bytes(1, "big")
        output += self.chunk_count.to_bytes(4, "big")
        output += self.padded_size.to_bytes(8, "big")
        output += self.salt  # Fixed at 32 bytes
        output += self.reserved  # Fixed at 5 bytes
        return output

    @classmethod
    def from_serialized(cls, data: bytes) -> "Header":
        """
        Parses and validates an ExEF v4 header.

        Validation steps follow the order mandated by the specification so that structurally
        impossible files are rejected before any key material is derived.

        :param data: the 56 header bytes
        :raises ValueError: if the header is malformed or fails any structural check
        :return: the parsed header
        """

        if len(data) != cls.size:
            raise ValueError(f"header must be {cls.size} bytes")

        if data[:4] != b"ExEF":
            raise ValueError("data must start with 'ExEF'")

        version = int.from_bytes(data[4:5], "big")
        if version != EXEF_VERSION:
            raise ValueError(f"version must be {EXEF_VERSION}")

        cipher_id = int.from_bytes(data[5:6], "big")
        if cipher_id not in _CIPHER_ID_TO_KEY_SIZE:
            raise ValueError("unknown cipher ID")

        exponent = int.from_bytes(data[6:7], "big")
        chunk_count_ = int.from_bytes(data[7:11], "big")
        padded_size = int.from_bytes(data[11:19], "big")
        salt = data[19:51]
        reserved = data[51:56]

        if reserved != b"\x00" * 5:
            raise ValueError("reserved bytes must be zero")

        _validate_structural(exponent, chunk_count_, padded_size)

        return cls(
            cipher_id=cipher_id,
            exponent=exponent,
            chunk_count=chunk_count_,
            padded_size=padded_size,
            salt=salt,
            reserved=reserved,
        )

    # Properties
    @property
    def chunk_size(self) -> int:
        """
        The plaintext chunk size, in bytes.
        """

        return 1 << self.exponent

    @property
    def key_size(self) -> int:
        """
        The key size for the configured cipher, in bytes.
        """

        return _CIPHER_ID_TO_KEY_SIZE[self.cipher_id]

    @property
    def strength(self) -> Literal[128, 192, 256]:
        """
        The key strength for the configured cipher, in bits.
        """

        return self.key_size * 8

    @property
    def body_size(self) -> int:
        """
        The total size of the body (i.e., all chunks plus their tags), in bytes.
        """

        return self.padded_size + TAG_SIZE * self.chunk_count

    # Public methods
    def compute_chunk_plaintext_size(self, index: int) -> int:
        """
        Returns the plaintext size of the chunk at the given index.

        :param index: the 0-based chunk index
        :return: the number of plaintext bytes in that chunk
        """

        if index < self.chunk_count - 1:
            return self.chunk_size
        return self.padded_size - (self.chunk_count - 1) * self.chunk_size
