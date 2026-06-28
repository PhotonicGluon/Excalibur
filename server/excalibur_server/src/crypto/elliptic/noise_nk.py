from hashlib import sha256
from typing import Literal

from Crypto.Cipher import AES

from excalibur_server.src.crypto.elliptic.ristretto255 import Ristretto255
from excalibur_server.src.crypto.hkdf import HKDF

PROTOCOL_NAME = b"Noise_NK_Ristretto255_AESGCM_SHA256"


class NoiseNK:
    """
    [Noise-NK protocol](https://noiseprotocol.org/noise.html) implementation using Ristretto255,
    AES-GCM, and SHA256.
    """

    def __init__(self, server_pub: Ristretto255):
        """
        Initialize the Noise-NK protocol with the server's public key.

        :param server_pub: server's public key
        """

        self._server_pub = server_pub
        "Server public key"

        # Initialization
        self._h = sha256(PROTOCOL_NAME).digest()
        "Hash output"
        self._ck = self._h
        "Chaining key"

        # Pre-message
        self._h = sha256(self._h + self._server_pub.to_bytes()).digest()

    # Helper methods
    def _hkdf(self, ikm: bytes, num_outputs: Literal[2, 3]) -> tuple[bytes, ...]:
        hkdf = HKDF("sha256")
        temp_key = hkdf.hmac_hash(self._ck, ikm)

        output_1 = hkdf.hmac_hash(temp_key, b"\x01")
        output_2 = hkdf.hmac_hash(temp_key, output_1 + b"\x02")
        if num_outputs == 2:
            return output_1, output_2

        output_3 = hkdf.hmac_hash(temp_key, output_2 + b"\x03")
        return output_1, output_2, output_3

    def _mix_hash(self, data: bytes):
        self._h = sha256(self._h + data).digest()

    def _mix_key(self, ikm: bytes) -> bytes:
        self._ck, k = self._hkdf(ikm, 2)
        return k

    def _encrypt_and_hash(self, k: bytes, pt: bytes) -> bytes:
        cipher = AES.new(k, AES.MODE_GCM, nonce=b"\x00" * 12)
        ct, tag = cipher.encrypt_and_digest(pt)
        ct = ct + tag
        self._mix_hash(ct)
        return ct

    def _decrypt_and_hash(self, k: bytes, ct: bytes) -> bytes:
        self._mix_hash(ct)
        ciphertext, tag = ct[:-16], ct[-16:]
        cipher = AES.new(k, AES.MODE_GCM, nonce=b"\x00" * 12)
        return cipher.decrypt_and_verify(ciphertext, tag)

    # Main methods
    def message_c_to_s(self, client_keyshare_priv: int | None = None) -> tuple[Ristretto255, bytes]:
        """
        Client to server message.

        Message pattern is "e, es".

        :param client_keyshare_priv: optional client ephemeral private keyshare value
        :return: client's public keyshare and authentication tag
        """

        # Message pattern "e"
        client_keyshare_priv = client_keyshare_priv or Ristretto255.random_scalar()
        client_keyshare_pub = client_keyshare_priv * Ristretto255.GENERATOR
        self._mix_hash(client_keyshare_pub.to_bytes())

        # Message pattern "es"
        dh = (client_keyshare_priv * self._server_pub).to_bytes()
        k = self._mix_key(dh)

        # EncryptAndHash(empty)
        tag = self._encrypt_and_hash(k, b"")
        return client_keyshare_pub, tag

    def message_s_to_c(
        self,
        client_keyshare_pub: Ristretto255,
        client_tag: bytes,
        server_priv: int,
        server_keyshare_priv: int | None = None,
    ) -> tuple[Ristretto255, bytes, bytes]:
        """
        Server to client message.

        Message pattern is "e, ee".

        :param client_keyshare_pub: client's public keyshare
        :param client_tag: client's tag
        :param server_priv: server's private key
        :param server_keyshare_priv: optional server ephemeral private keyshare value
        :return: the server's public keyshare, the server's tag, and the shared secret
        """

        # Validate client message
        self._mix_hash(client_keyshare_pub.to_bytes())
        dh = (client_keyshare_pub * server_priv).to_bytes()
        k = self._mix_key(dh)
        self._decrypt_and_hash(k, client_tag)

        # Message pattern "e"
        server_keyshare_priv = server_keyshare_priv or Ristretto255.random_scalar()
        server_keyshare_pub = server_keyshare_priv * Ristretto255.GENERATOR
        self._mix_hash(server_keyshare_pub.to_bytes())

        # Message pattern "ee"
        dh = (client_keyshare_pub * server_keyshare_priv).to_bytes()
        k = self._mix_key(dh)

        # EncryptAndHash(empty)
        server_tag = self._encrypt_and_hash(k, b"")

        # Derive session key
        k_send, _ = self._hkdf(b"", 2)
        return server_keyshare_pub, server_tag, k_send

    def client_derive_session_key(
        self, client_keyshare_priv: int, server_keyshare_pub: Ristretto255, server_tag: bytes
    ) -> bytes:
        """
        Method to derive the session key on the client side.

        :param client_keyshare_priv: client's ephemeral private keyshare
        :param server_keyshare_pub: server's ephemeral public keyshare
        :param server_tag: server's tag
        :return: the shared secret
        """

        # Verify server message
        self._mix_hash(server_keyshare_pub.to_bytes())
        dh = (client_keyshare_priv * server_keyshare_pub).to_bytes()
        k = self._mix_key(dh)
        self._decrypt_and_hash(k, server_tag)

        # Derive session key
        k_send, _ = self._hkdf(b"", 2)
        return k_send
