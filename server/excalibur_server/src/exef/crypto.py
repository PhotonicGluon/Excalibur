from queue import Empty, Queue

from Crypto.Cipher import AES, _mode_gcm

from .structures import Footer, Header


class Encryptor:
    """
    Class that handles the encryption of ExEF messages.
    """

    def __init__(self, key: bytes, nonce: bytes):
        """
        Initializes the Encryptor with a given key and nonce.

        :param key: The encryption key as bytes.
        :param nonce: The nonce used for AES-GCM encryption.
        """

        self.key = key
        self._nonce = nonce

        self._ct_len: int = -1
        self._header: Header | None = None

        self._cipher: _mode_gcm.GcmMode | None = None

        self._header_sent = False
        self._ct_sent_len = 0
        self._queue = Queue()

    # Properties
    @property
    def cipher(self) -> _mode_gcm.GcmMode:
        """
        The AES-GCM cipher object.

        :raises ValueError: If parameters are not set before requesting the cipher.
        :return: The AES-GCM cipher object.
        """

        if self._cipher is None:
            if self._nonce is None or self._ct_len == -1 or self._header is None:
                raise ValueError("parameters must be set")
            self._cipher = AES.new(self.key, AES.MODE_GCM, nonce=self._nonce)

        return self._cipher

    @property
    def fully_processed(self) -> bool:
        """
        Checks if the encryptor has processed all parts of the message.

        :raises ValueError: If parameters are not set
        :return: True if the encryptor has processed all parts of the message, False otherwise
        """

        if self._ct_len == -1:
            raise ValueError("parameters must be set")
        return self._ct_sent_len == self._ct_len

    # Public methods
    def set_params(self, *, length: int):
        """
        Sets the parameters for the encryption process.

        :param length: The length of the plaintext to be encrypted.
        :raises ValueError: If parameters are set before requesting the cipher.
        """

        self._ct_len = length  # Ciphertext length is equal to plaintext length
        self._header = Header(keysize=len(self.key) * 8, nonce=self._nonce, ct_len=length)

    def update(self, data: bytes):
        """
        Encrypts the given data.

        :param data: The data to be encrypted.
        """

        self._queue.put(self.cipher.encrypt(data))
        self._ct_sent_len += len(data)

    def get(self) -> bytes:
        """
        Gets the next piece of encrypted data.

        If the header was not yet sent, it is sent first.
        Then, the body is sent.
        If there is no more data left in the queue, the footer is sent.
        If there is still data left in the queue, an empty bytes object is returned.

        :return: The next piece of data.
        """

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
        """
        Encrypts the given plaintext.

        :param pt: The plaintext to be encrypted as bytes.
        :return: The encrypted ciphertext as bytes.
        """

        self.set_params(length=len(pt))
        self.update(pt)
        output = self.get() + self.get() + self.get()  # First is header, then body, then footer
        return output


class Decryptor:
    """
    Class that handles the decryption of ExEF messages.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Decryptor with a given key.

        :param key: The encryption key as bytes.
        """

        self.key = key

        self._header: Header | None = None
        self._footer: Footer | None = None

        self._cipher: _mode_gcm.GcmMode | None = None

        self._buffer = b""
        self._header_remaining = Header.size
        self._footer_remaining = Footer.size
        self._ct_len_left = -1
        self._queue = Queue()  # Queue of ciphertext chunks

    # Properties
    @property
    def cipher(self) -> _mode_gcm.GcmMode:
        """
        The AES-GCM cipher object used for decryption.

        :raises ValueError: If the header is not set before requesting the cipher.
        :return: The AES-GCM cipher object.
        """

        if self._cipher is None:
            if self._header is None:
                raise ValueError("header must be set")
            self._cipher = AES.new(self.key, AES.MODE_GCM, nonce=self._header.nonce)

        return self._cipher

    @property
    def fully_processed(self) -> bool:
        """
        Checks if the decryptor has processed all parts of the message.

        :return: True if the decryptor has processed all parts of the message, False otherwise.
        """

        return self._header is not None and self._footer is not None

    # Public methods
    def update(self, data: bytes):
        """
        Updates the decryptor with the given ciphertext data.

        :param data: The ciphertext data as bytes
        """

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
        """
        Gets the next piece of decrypted data.

        If no data is left in the queue (or if nothing is in the queue), an empty bytes object is
        returned.

        :return: The next piece of data.
        """

        try:
            return self._queue.get(block=False)
        except Empty:
            return b""

    def verify(self):
        """
        Verifies the integrity of the decrypted data.

        :raises ValueError: If the header or footer have not been set
        :raises ValueError: If the footer is not valid (e.g., wrong tag)
        """

        if self._header is None or self._footer is None:
            raise ValueError("header and footer must be set")

        self.cipher.verify(self._footer.tag)

    def decrypt(self, exef_data: bytes) -> bytes:
        """
        Decrypts the given ExEF data.

        :param exef_data: The ExEF data as bytes
        :return: The decrypted data as bytes
        :raises ValueError: If the header or footer have not been set
        :raises ValueError: If the footer is not valid (e.g., wrong tag)
        """

        self.update(exef_data)
        output = self.get()
        self.verify()
        return output
