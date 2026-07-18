from abc import ABC
from queue import Empty, Queue

from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import HKDF
from Crypto.Random import get_random_bytes

from excalibur_server.src.crypto.consts import MAX_UINT64
from excalibur_server.src.crypto.exef.padme import PADME

from .structures import (
    DEFAULT_EXPONENT,
    LENGTH_PREFIX_SIZE,
    MAX_CHUNK_COUNT,
    MAX_EXPONENT,
    MIN_EXPONENT,
    SALT_SIZE,
    TAG_SIZE,
    Header,
    KeyStrength,
    aad,
    cipher_id_for_key_size,
    compute_chunk_count,
    compute_padded_size,
    nonce,
)


def derive_crypto_key(key: bytes, salt: bytes, cipher_id: int, key_size: int) -> bytes:
    """
    Derives the ExEF v4 crypto key from a main key and salt using HKDF-SHA256.

    :param key: the main key
    :param salt: the 32-byte HKDF salt
    :param cipher_id: the cipher ID (appended to the HKDF `info` string)
    :param key_size: the desired key length, in bytes
    :return: the derived crypto key
    """

    info = b"ExEF v4 Crypto Key" + cipher_id.to_bytes(1, "big")
    return HKDF(key, key_size, salt, SHA256, context=info)


class Cryptor(ABC):
    """
    Base class for ExEF v4 encryption and decryption.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Cryptor with a given key.

        :param key: the main key as bytes
        """

        self.key = key
        "Key used for encryption/decryption"

        self._queue: Queue = Queue()
        "Queue used for buffering decrypted/encrypted output"

    @property
    def is_queue_clear(self) -> bool:
        """
        Checks if the output queue is empty.

        :return: whether the queue is empty
        """

        return self._queue.qsize() == 0

    def _drain(self) -> bytes:
        """
        Drains and concatenates all currently-available output from the queue.

        :return: the concatenated output, or empty if nothing is queued
        """

        out = b""
        while True:
            try:
                out += self._queue.get(block=False)
            except Empty:
                break
        return out


class Encryptor(Cryptor):
    """
    Class that handles the encryption of ExEF v4 messages.
    """

    def __init__(
        self,
        key: bytes,
        salt: bytes | None = None,
        strength: KeyStrength | None = None,
        exponent: int = DEFAULT_EXPONENT,
    ):
        """
        Initializes the Encryptor.

        :param key: the main key as bytes
        :param salt: the 32-byte HKDF salt. If not provided, a fresh random salt is generated
        :param strength: the crypto key strength in bits, defaults to the length of `key` in bits
        :param exponent: the chunk size exponent, defaults to the `DEFAULT_EXPONENT`
        """

        super().__init__(key)

        if strength is None:
            strength = len(key) * 8
        self._strength = strength
        self._key_size = strength // 8
        self._cipher_id = cipher_id_for_key_size(self._key_size)

        if salt is None:
            salt = get_random_bytes(SALT_SIZE)
        if len(salt) != SALT_SIZE:
            raise ValueError(f"salt must be {SALT_SIZE} bytes")
        self._salt = salt

        if not (MIN_EXPONENT <= exponent <= MAX_EXPONENT):
            raise ValueError(f"exponent must be between {MIN_EXPONENT} and {MAX_EXPONENT}")
        self._exponent = exponent

        self._crypto_key = derive_crypto_key(key, salt, self._cipher_id, self._key_size)

        # These parameters will be defined by `set_params()`
        self._length: int = -1
        self._padded_size: int = -1
        self._chunk_count: int = -1
        self._header_bytes: bytes | None = None

        # Streaming state
        self._pre_buffer = b""
        self._pt_received = 0
        self._padding_added = False
        self._chunks_emitted = 0
        self._header_sent = False

    # Properties
    @property
    def fully_processed(self) -> bool:
        """
        Whether every chunk has been generated and queued.
        """

        if self._chunk_count == -1:
            raise ValueError("parameters must be set")
        return self._chunks_emitted == self._chunk_count

    # Helper methods
    def _emit_chunk(self, chunk_pt: bytes, is_final: bool):
        """
        Emits a chunk of encrypted data.

        :param chunk_pt: the plaintext chunk to encrypt
        :param is_final: whether this is the final chunk
        """

        index = self._chunks_emitted
        cipher = AES.new(self._crypto_key, AES.MODE_GCM, nonce=nonce(index))
        cipher.update(aad(self._header_bytes, index, is_final))
        ct, tag = cipher.encrypt_and_digest(chunk_pt)
        self._queue.put(ct + tag)
        self._chunks_emitted += 1

    def _emit_ready_chunks(self):
        """
        Emits ready chunks from the pre-buffer.
        """

        chunk_size = 1 << self._exponent

        # Emit any complete non-final chunks
        while self._chunks_emitted < self._chunk_count - 1 and len(self._pre_buffer) >= chunk_size:
            chunk_pt = self._pre_buffer[:chunk_size]
            self._pre_buffer = self._pre_buffer[chunk_size:]
            self._emit_chunk(chunk_pt, is_final=False)

        # Emit the final chunk once all padding is in place and only it remains
        if self._padding_added and self._chunks_emitted == self._chunk_count - 1:
            chunk_pt = self._pre_buffer
            self._pre_buffer = b""
            self._emit_chunk(chunk_pt, is_final=True)

    # Main methods
    def set_params(self, *, length: int):
        """
        Sets the parameters for the encryption process.

        :param length: the length of the plaintext to be encrypted
        :raises ValueError: if the resulting encrypted data would exceed the format's size limits
        :raises ValueError: if there will be too many chunks
        """

        padded_size = compute_padded_size(length)
        if padded_size < length or padded_size > MAX_UINT64:
            # `padded_size < length` catches a fixed-width PADME overflow near 2**64
            raise ValueError("plaintext too large")

        chunk_size = 1 << self._exponent
        n = compute_chunk_count(padded_size, chunk_size)
        if n > MAX_CHUNK_COUNT:
            raise ValueError("too many chunks")

        self._length = length
        self._padded_size = padded_size
        self._chunk_count = n

        header = Header(
            cipher_id=self._cipher_id,
            exponent=self._exponent,
            chunk_count=n,
            padded_size=padded_size,
            salt=self._salt,
        )
        self._header_bytes = header.serialize_as_bytes()

        # Seed the pre-encryption stream with the big-endian plaintext length prefix
        self._pre_buffer = length.to_bytes(LENGTH_PREFIX_SIZE, "big")

    def update(self, data: bytes):
        """
        Feeds plaintext to the encryptor, emitting whole chunks as they become available.

        :param data: the plaintext data to encrypt
        :raises ValueError: if parameters have not been set
        :raises ValueError: if more plaintext is supplied than was declared to `set_params()`
        """

        if self._header_bytes is None:
            raise ValueError("parameters must be set")

        if self._pt_received + len(data) > self._length:
            raise ValueError("more plaintext supplied than declared length")

        self._pre_buffer += data
        self._pt_received += len(data)

        # Once all plaintext has arrived, append the PADME padding
        if self._pt_received == self._length and not self._padding_added:
            self._pre_buffer += b"\x00" * (self._padded_size - LENGTH_PREFIX_SIZE - self._length)
            self._padding_added = True

        self._emit_ready_chunks()

    def get(self) -> bytes:
        """
        Gets the next piece of encrypted data.

        The header is emitted first, followed by all currently-available body chunks. Once the body
        is exhausted this returns an empty bytes object.

        :return: the next piece of data, or an empty bytes object if no more data is available
        """

        if not self._header_sent:
            self._header_sent = True
            return self._header_bytes

        return self._drain()

    def encrypt(self, pt: bytes) -> bytes:
        """
        Encrypts the given plaintext in one shot.

        :param pt: the plaintext to encrypt
        :return: the complete ExEF v4 file as bytes
        """

        self.set_params(length=len(pt))
        self.update(pt)
        return self.get() + self.get()  # Header, then all body chunks


class Decryptor(Cryptor):
    """
    Class that handles the decryption of ExEF v4 messages.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Decryptor with a given key.

        :param key: the main key as bytes
        """

        super().__init__(key)

        self._header: Header | None = None
        self._header_bytes: bytes | None = None
        self._crypto_key: bytes | None = None

        self._ct_buf = b""  # Buffered ciphertext awaiting a complete chunk
        self._chunk_index = 0

        # Pre-encryption plaintext parsing state
        self._prefix_buf = b""
        self._length: int | None = None
        self._pt_remaining: int | None = None

        self._error: Exception | None = None
        self._failed = False

    # Properties
    @property
    def fully_processed(self) -> bool:
        """
        Whether the header and every chunk have been successfully processed.

        :return: whether all parts of the message have been processed
        """

        return self._header is not None and not self._failed and self._chunk_index == self._header.chunk_count

    # Helper methods
    def _process_pre_encryption(self, chunk_pt: bytes):
        """
        Processes a chunk of plaintext that has been decrypted but not yet parsed.

        :param chunk_pt: the plaintext chunk to process
        """

        data = chunk_pt

        # Read the 8-byte plaintext length prefix, which could span multiple chunks
        if self._length is None:
            need = LENGTH_PREFIX_SIZE - len(self._prefix_buf)
            self._prefix_buf += data[:need]
            data = data[need:]
            if len(self._prefix_buf) < LENGTH_PREFIX_SIZE:
                return

            self._length = int.from_bytes(self._prefix_buf, "big")
            expected_padme = self._header.padded_size - LENGTH_PREFIX_SIZE
            if self._length > expected_padme or PADME.compute_padded_length(self._length) != expected_padme:
                self._error = ValueError("declared plaintext size is inconsistent with padding")
                self._failed = True
                return
            self._pt_remaining = self._length

        # Emit plaintext bytes
        if self._pt_remaining > 0:
            n = min(self._pt_remaining, len(data))
            if n:
                self._queue.put(data[:n])
                self._pt_remaining -= n
            data = data[n:]

        # Anything left is padding; enforce canonical (all-zero) padding
        if data and any(byte != 0 for byte in data):
            self._error = ValueError("padding must be zero")
            self._failed = True

    # Main methods
    def update(self, data: bytes):
        """
        Feeds ciphertext to the decryptor.

        Chunks are decrypted and verified as they become available.

        :param data: the ciphertext data
        :note: a failing tag does not raise immediately; the error is recorded and surfaced by
            `verify()`, so that callers can distinguish a tampered stream from an incomplete one
        """

        if self._failed:
            return

        self._ct_buf += data

        # Parse the header first
        if self._header is None:
            if len(self._ct_buf) < Header.size:
                return
            self._header_bytes = self._ct_buf[: Header.size]
            self._ct_buf = self._ct_buf[Header.size :]
            try:
                self._header = Header.from_serialized(self._header_bytes)
            except ValueError as exc:
                self._error = exc
                self._failed = True
                return
            self._crypto_key = derive_crypto_key(
                self.key, self._header.salt, self._header.cipher_id, self._header.key_size
            )

        # Decrypt whole chunks as they arrive
        while self._chunk_index < self._header.chunk_count:
            plaintext_size = self._header.chunk_plaintext_size(self._chunk_index)
            expected = plaintext_size + TAG_SIZE
            if len(self._ct_buf) < expected:
                return

            blob = self._ct_buf[:expected]
            self._ct_buf = self._ct_buf[expected:]
            ct, tag = blob[:plaintext_size], blob[plaintext_size:]

            is_final = self._chunk_index == self._header.chunk_count - 1
            cipher = AES.new(self._crypto_key, AES.MODE_GCM, nonce=nonce(self._chunk_index))
            cipher.update(aad(self._header_bytes, self._chunk_index, is_final))
            try:
                chunk_pt = cipher.decrypt_and_verify(ct, tag)
            except ValueError:
                self._error = ValueError("chunk authentication failed")
                self._failed = True
                return

            self._process_pre_encryption(chunk_pt)
            self._chunk_index += 1

    def get(self) -> bytes:
        """
        Gets the next piece of decrypted plaintext.

        :return: the next piece of data, or empty if nothing is queued
        """

        return self._drain()

    def verify(self):
        """
        Verifies the integrity of the decrypted data.

        :raises ValueError: if any chunk failed authentication
        :raises ValueError: if the stream is incomplete
        :raises ValueError: if trailing bytes remain after the final chunk
        """

        if self._error is not None:
            raise self._error
        if not self.fully_processed:
            raise ValueError("incomplete ExEF data")
        if self._ct_buf:
            raise ValueError("trailing data after final chunk")

    def decrypt(self, exef_data: bytes) -> bytes:
        """
        Decrypts the given ExEF v4 data in one shot.

        :param exef_data: the ExEF data as bytes
        :return: the decrypted plaintext as bytes
        :raises ValueError: if the data is malformed or fails authentication
        """

        self.update(exef_data)
        output = self._drain()
        self.verify()
        return output
