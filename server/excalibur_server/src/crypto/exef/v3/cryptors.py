from hmac import compare_digest
from queue import Empty

from Crypto.Cipher import AES, _mode_gcm
from Crypto.Hash import HMAC, SHA256
from Crypto.Protocol.KDF import HKDF

from excalibur_server.src.crypto.exef.base.cryptors import BaseCryptor, BaseDecryptor, BaseEncryptor, KeyStrength

from .structures import Footer, Header


class Cryptor(BaseCryptor):
    """
    Base class for encryption and decryption.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Cryptor with a given key.

        :param key: the main key as bytes
        """

        super().__init__(key)

        self._cipher: _mode_gcm.GcmMode | None = None
        "Internal AES-GCM cipher object that handles cryptographic operations"

    # Properties
    @property
    def cipher(self) -> _mode_gcm.GcmMode:
        """
        The AES-GCM cipher object used for encryption/decryption.

        :return: the AES-GCM cipher object
        """

        raise NotImplementedError()

    # Static methods
    @staticmethod
    def _gen_key(key: bytes, nonce: bytes, context: bytes, length: int):
        return HKDF(key, length, nonce, SHA256, context=context)

    @staticmethod
    def _gen_crypto_key(key: bytes, nonce: bytes, length: int):
        return Cryptor._gen_key(key, nonce, b"ExEF Crypto Key", length)

    @staticmethod
    def _gen_mac_key(key: bytes, nonce: bytes, length: int):
        return Cryptor._gen_key(key, nonce, b"ExEF MAC Key", length)


class Encryptor(BaseEncryptor, Cryptor):
    """
    Class that handles the encryption of ExEF messages.
    """

    def __init__(self, key: bytes, nonce: bytes, strength: KeyStrength | None = None):
        """
        Initializes the Encryptor with a given key and nonce.

        :param key: The main key as bytes
        :param nonce: The nonce used for AES-GCM encryption
        :parma strength: crypto/MAC key strength, defaults to the length of `key` in bits
        """

        super(Encryptor, self).__init__(key, strength=strength)

        self._nonce = nonce

        self._crypto_key = self._gen_crypto_key(key, nonce, strength // 8)
        self._mac_key = self._gen_mac_key(key, nonce, strength // 8)

        self._ct_len: int = -1
        self._header: Header | None = None

        self._header_sent = False
        self._ct_sent_len = 0

    # Properties
    @property
    def cipher(self) -> _mode_gcm.GcmMode:
        if self._cipher is None:
            if self._nonce is None or self._ct_len == -1 or self._header is None:
                raise ValueError("parameters must be set")
            self._cipher = AES.new(self._crypto_key, AES.MODE_GCM, nonce=self._nonce)

        return self._cipher

    @property
    def fully_processed(self) -> bool:
        if self._ct_len == -1:
            raise ValueError("parameters must be set")
        return self._ct_sent_len == self._ct_len

    # Public methods
    def set_params(self, *, length: int):
        super().set_params(length=length)

        self._ct_len = length  # Ciphertext length is equal to plaintext length

        # Determine cipher ID
        if self._strength == 128:
            cipher_id = 1
        elif self._strength == 192:
            cipher_id = 2
        elif self._strength == 256:
            cipher_id = 3
        else:
            raise ValueError("strength must be 128, 192, or 256")

        # Generate header MAC
        header = Header(
            cipher_id=cipher_id,
            nonce=self._nonce,
            header_mac="\x00" * 14,  # We first set the header MAC to all zeros
            ct_len=length,
        )
        hmac = HMAC.new(self._mac_key, header.serialize_as_bytes(), SHA256)
        header_mac = hmac.digest()[:14]  # We keep only first 14 bytes
        header.header_mac = header_mac

        self._header = header

    def update(self, data: bytes):
        self._queue.put(self.cipher.encrypt(data))
        self._ct_sent_len += len(data)

    def get(self) -> bytes:
        # Get header first
        if not self._header_sent:
            self._header_sent = True
            return self._header.serialize_as_bytes()

        # Get body
        try:
            return self._queue.get(block=False)
        except Empty:
            # Nothing left in queue, see if we sent all data
            if self._ct_sent_len >= self._ct_len:
                tag = self.cipher.digest()
                footer = Footer(tag=tag)
                return footer.serialize_as_bytes()

            # Nothing in queue but not all data sent...
            return b""

    def encrypt(self, pt: bytes) -> bytes:
        self.set_params(length=len(pt))
        self.update(pt)
        output = self.get() + self.get() + self.get()  # First is header, then body, then footer
        return output


class Decryptor(BaseDecryptor, Cryptor):
    """
    Class that handles the decryption of ExEF messages.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Decryptor with a given key.

        :param key: the main key as bytes
        """

        super().__init__(key)

        self._crypto_key: bytes | None = None
        self._mac_key: bytes | None = None

        self._header: Header | None = None
        self._footer: Footer | None = None

        self._buffer = b""
        self._header_remaining = Header.size
        self._footer_remaining = Footer.size
        self._ct_len_left = -1

    # Properties
    @property
    def cipher(self) -> _mode_gcm.GcmMode:
        if self._cipher is None:
            if self._header is None:
                raise ValueError("header must be set")

            self._crypto_key = self._gen_crypto_key(self.key, self._header.nonce, self._header.strength // 8)
            self._mac_key = self._gen_mac_key(self.key, self._header.nonce, self._header.strength // 8)

            # Verify header MAC
            header_copy = self._header.model_copy()
            header_copy.header_mac = b"\x00" * 14
            hmac = HMAC.new(self._mac_key, header_copy.serialize_as_bytes(), SHA256)
            header_mac = hmac.digest()[:14]
            if not compare_digest(header_mac, self._header.header_mac):
                raise ValueError("header MAC mismatch")

            self._cipher = AES.new(self._crypto_key, AES.MODE_GCM, nonce=self._header.nonce)

        return self._cipher

    @property
    def fully_processed(self) -> bool:
        return self._header is not None and self._footer is not None

    # Public methods
    def update(self, data: bytes):
        # Handle header
        if self._header_remaining > 0:
            self._buffer += data
            self._header_remaining -= len(data)

            if self._header_remaining <= 0:
                # We have enough data to set the header
                self._header = Header.from_serialized(self._buffer[: Header.size])

                # Enqueue first part
                data = self._buffer[Header.size :]
                self._ct_len_left = self._header.ct_len
                self._buffer = b""
            else:
                return

        # Handle ciphertext
        if self._ct_len_left > 0:
            if len(data) <= self._ct_len_left:
                # Just put incoming data into the queue
                self._queue.put(self.cipher.decrypt(data))
                self._ct_len_left -= len(data)
                return
            else:  # Incoming data contains part of footer
                self._queue.put(self.cipher.decrypt(data[: self._ct_len_left]))
                data = data[self._ct_len_left :]
                self._ct_len_left = 0

        # Handle footer
        if self._footer_remaining > 0:
            self._buffer += data
            self._footer_remaining -= len(data)

            if self._footer_remaining <= 0:
                # We have enough data to set the footer
                self._footer = Footer.from_serialized(self._buffer[: Footer.size])
                self._buffer = b""

    def get(self) -> bytes:
        try:
            return self._queue.get(block=False)
        except Empty:
            return b""

    def verify(self):
        if self._header is None or self._footer is None:
            raise ValueError("header and footer must be set")

        self.cipher.verify(self._footer.tag)

    def decrypt(self, exef_data: bytes) -> bytes:
        self.update(exef_data)
        output = self.get()
        self.verify()
        return output
