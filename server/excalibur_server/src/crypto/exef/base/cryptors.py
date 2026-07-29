from abc import ABC, abstractmethod
from queue import Empty, Queue
from typing import Literal

KeyStrength = Literal[128, 192, 256]


class BaseCryptor(ABC):
    """
    Base class for encryption and decryption.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Cryptor with a given key.

        :param key: the main key as bytes
        """

        self.key = key
        "Key used for encryption/decryption"

        self._queue = Queue()
        "Queue used for buffering decrypted/encrypted output"

    # Properties
    @property
    def is_queue_clear(self):
        """
        Checks if the encryption/decryption queue is empty.

        :return: whether the queue is empty
        """

        return self._queue.qsize() == 0

    @property
    @abstractmethod
    def fully_processed(self) -> bool:
        """
        Checks if the whole message have been processed.

        This includes getting the header and footer. To check if there are no more data in the
        queue, access the `is_queue_clear` property instead.

        :return: whether all parts of the message have been processed
        """

        raise NotImplementedError()

    # Helper methods
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

    # Public methods
    @abstractmethod
    def update(self, data: bytes):
        """
        Feeds data to the cryptor, emitting data as they become available.

        :param data: the data to process
        """

        raise NotImplementedError()

    @abstractmethod
    def get(self) -> bytes:
        """
        Gets the next piece of processed data.

        :return: the next piece of data, or an empty bytes object if no more data is available
        """

        raise NotImplementedError()


class BaseEncryptor(BaseCryptor):
    """
    Base class that handles the encryption of ExEF messages.
    """

    def __init__(
        self,
        key: bytes,
        strength: KeyStrength | None = None,
    ):
        """
        Initializes the Encryptor.

        :param key: the main key as bytes
        :param strength: the crypto key strength in bits, defaults to the length of `key` in bits
        """

        super().__init__(key)

        if strength is None:
            strength = len(key) * 8
        self._strength = strength

        self._length: int = -1  # This will be set in `set_params()`

    # Main methods
    def set_params(self, *, length: int):
        """
        Sets the parameters for the encryption process.

        :param length: the length of the plaintext to be encrypted
        """

        self._length = length

    @abstractmethod
    def encrypt(self, pt: bytes) -> bytes:
        """
        Encrypts the given plaintext in one shot.

        :param pt: the plaintext to encrypt
        :return: the complete ExEF data
        """

        raise NotImplementedError()


class BaseDecryptor(BaseCryptor):
    """
    Class that handles the decryption of ExEF messages.
    """

    def __init__(self, key: bytes):
        """
        Initializes the Decryptor with a given key.

        :param key: the main key as bytes
        """

        super().__init__(key)

    # Public methods
    @abstractmethod
    def verify(self):
        """
        Verifies the integrity of the decrypted data.
        """

        raise NotImplementedError()

    @abstractmethod
    def decrypt(self, exef_data: bytes) -> bytes:
        """
        Decrypts the given ExEF data in one shot.

        :param exef_data: the ExEF data as bytes
        :return: the decrypted plaintext as bytes
        """

        raise NotImplementedError()
