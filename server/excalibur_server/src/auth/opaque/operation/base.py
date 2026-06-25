from functools import cached_property
from typing import Callable

from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.opaque.misc import i2osp
from excalibur_server.src.auth.opaque.oprf import OPRFRistrettoSHA512, OPRFType
from excalibur_server.src.auth.opaque.structures import (
    KE1,
    KE3,
    AuthRequest,
    CleartextCredentials,
    CredentialRequest,
    CredentialResponse,
    Envelope,
    RegistrationRecord,
    RegistrationRequest,
    RegistrationResponse,
)
from excalibur_server.src.crypto.hkdf import HKDF
from excalibur_server.src.crypto.ristretto255 import Ristretto255


class OPAQUEAuthError(Exception):
    pass


class OPAQUEClientAuthError(OPAQUEAuthError):
    pass


class BaseOPAQUE:
    """
    Base class for the OPAQUE protocol implementation as described in
    [RFC9807](https://datatracker.ietf.org/doc/html/rfc9807).
    """

    NONCE_LENGTH = 32  # See section 2
    SEED_LENGTH = 32  # See section 2

    def __init__(
        self,
        oprf_type: OPRFType = "ristretto255-sha512",
        ksf: Callable[[bytes], bytes] | None = None,
        context: bytes = b"Excalibur",
    ) -> None:
        self.context = context
        self.oprf_type = oprf_type

        if oprf_type == "ristretto255-sha512":
            self.oprf = OPRFRistrettoSHA512
            self.kdf = HKDF("sha512")
        else:
            raise ValueError(f"Unsupported OPRF type: {oprf_type}")

        self._ksf = ksf or (lambda x: x)  # Identity function as default

    # Properties
    @cached_property
    def registration_request_size(self) -> int:
        """
        :returns: size of the registration request in bytes
        """

        return Ristretto255.KEY_LENGTH

    @cached_property
    def registration_response_size(self) -> int:
        """
        :returns: size of the registration response in bytes
        """

        return (
            Ristretto255.KEY_LENGTH  # Evaluated element
            + Ristretto255.KEY_LENGTH  # Server public key
        )

    @cached_property
    def registration_record_size(self) -> int:
        """
        :returns: size of the registration record in bytes
        """

        return (
            Ristretto255.KEY_LENGTH  # Public key
            + self.kdf.digest_size  # Masking key
            # Envelope
            + self.NONCE_LENGTH  # Envelope nonce
            + self.kdf.digest_size  # Auth tag
        )

    @cached_property
    def ke1_size(self) -> int:
        """
        :returns: size of the KE1 message in bytes
        """

        return (
            # Credential request
            Ristretto255.KEY_LENGTH  # Blinded element
            # Authentication request
            + self.NONCE_LENGTH  # Client nonce
            + Ristretto255.KEY_LENGTH  # Client public keyshare
        )

    # Helper methods
    def _hash(self, data: bytes) -> bytes:
        """
        Implements the `Hash()` function described in section 2.3.

        :param data: the data to hash
        :return: the hash of the data
        """

        return self.oprf.hashfunc(data).digest()

    def _create_cleartext_credentials(
        self,
        server_public_key: Ristretto255,
        client_public_key: Ristretto255,
        server_identity: bytes,
        client_identity: bytes,
    ):
        """
        Create cleartext credentials for the server, following section 4's
        `CreateCleartextCredentials()` function.

        :param server_public_key: the server's public key
        :param client_public_key: the client's public key
        :param server_identity: optional server's identity
        :param client_identity: optional client's identity
        :return: the cleartext credentials
        """

        if server_identity == b"":
            server_identity = server_public_key.to_bytes()
        if client_identity == b"":
            client_identity = client_public_key.to_bytes()

        cleartext_credentials = CleartextCredentials(
            server_public_key=server_public_key,
            server_identity=server_identity,
            client_identity=client_identity,
        )
        return cleartext_credentials

    def _derive_diffie_hellman_keypair(self, seed: bytes) -> tuple[int, Ristretto255]:
        """
        Derive a Diffie-Hellman keypair from a seed, as described in section 6.4.1.1.

        :param seed: the seed to derive the keypair from
        :return: a tuple of the private key and the public key
        """

        return self.oprf.generate_keys(seed=seed, info=b"OPAQUE-DeriveDiffieHellmanKeyPair")

    def _diffie_hellman(self, k: int, b: Ristretto255) -> Ristretto255:
        """
        Performs the Diffie-Hellman operation between the private input `k` and public input `b` as
        described in section 6.4.1.1, with validation as required in section 10.7.

        We differ from the specification by returning the base curve element instead of its
        serialized form.

        :param k: the private input
        :param b: the public input
        :raises OPAQUEAuthError: if the shared secret is the point at infinity
        :return: the shared secret
        """

        shared_secret = k * b
        if shared_secret.is_identity():
            raise OPAQUEAuthError("Diffie-Hellman shared secret is the point at infinity")
        return shared_secret

    def _expand_label(self, secret: bytes, label: bytes, context: bytes, length: int) -> bytes:
        """
        Implements the `Expand-Label()` function in section 6.4.2.1.

        :param secret: the secret to expand
        :param label: the label to use
        :param context: the context to use
        :param length: the length of the expanded secret
        :return: the expanded secret
        """

        opaque_label = b"OPAQUE-" + label
        custom_label = i2osp(length, 2) + i2osp(len(opaque_label), 1) + opaque_label + i2osp(len(context), 1) + context

        return self.kdf.expand(
            secret,
            custom_label,
            length,
        )

    def _derive_secret(self, secret: bytes, label: bytes, transcript_hash: bytes) -> bytes:
        """
        Implements the `Derive-Secret()` function in section 6.4.2.1.

        :param secret: the secret to derive
        :param label: the label to use
        :param transcript_hash: the transcript hash to use
        :return: the derived secret
        """

        return self._expand_label(secret, label, transcript_hash, self.kdf.digest_size)

    def _generate_preamble(
        self,
        client_identity: bytes,
        ke1: KE1,
        server_identity: bytes,
        credential_response: CredentialResponse,
        server_nonce: bytes,
        server_public_keyshare: Ristretto255,
    ) -> bytes:
        """
        Generates the preamble string for the key scheduling, following section 6.4.2.1's
        `Preamble()` function.

        :param client_identity: the client's identity
        :param ke1: the KE1 message
        :param server_identity: the server's identity
        :param credential_response: the credential response
        :param server_nonce: the server's nonce
        :param server_public_keyshare: the server's public keyshare
        :return: the preamble string, the protocol transcript with identities and messages
        """

        return (
            b"OPAQUEv1-"
            + i2osp(len(self.context), 2)
            + self.context
            + i2osp(len(client_identity), 2)
            + client_identity
            + ke1.serialize()
            + i2osp(len(server_identity), 2)
            + server_identity
            + credential_response.serialize()
            + server_nonce
            + server_public_keyshare.to_bytes()
        )

    def _derive_keys(self, ikm: bytes, preamble: bytes) -> tuple[bytes, bytes, bytes]:
        """
        Derives the session keys from the shared secret, following section 6.4.2.2's
        `DeriveKeys()` function.

        :param ikm: the shared secret
        :param preamble: the preamble string
        :return: the `km2`, `km3`, and `session_key` values
        """

        prk = self.kdf.extract(b"", ikm)

        preamble_hash = self._hash(preamble)
        handshake_secret = self._derive_secret(prk, b"HandshakeSecret", preamble_hash)
        session_key = self._derive_secret(prk, b"SessionKey", preamble_hash)
        km2 = self._derive_secret(handshake_secret, b"ServerMAC", b"")
        km3 = self._derive_secret(handshake_secret, b"ClientMAC", b"")

        return km2, km3, session_key

    # Main methods
    def generate_seed(self) -> bytes:
        """
        Generates a seed for use in OPAQUE.

        Not an official method of the OPAQUE specification.

        :return: a random seed
        """

        return get_random_bytes(self.SEED_LENGTH)

    def generate_keys(self, for_export: bool = False) -> tuple[int, Ristretto255] | tuple[bytes, bytes]:
        """
        Generates a public-private key pair for OPAQUE.

        Not an official method of the OPAQUE specification.

        :param for_export: whether the keys are being generated for export (i.e. they will be
            converted into bytes)
        :return: a tuple of (private_key, public_key)
        """

        return self.oprf.generate_keys(for_export=for_export)

    def deserialize_registration_request(self, registration_request_raw: bytes) -> RegistrationRequest:
        """
        Deserializes a registration request from raw bytes.

        :param registration_request_raw: the raw bytes of the registration request
        :return: the deserialized registration request
        """

        return RegistrationRequest(blinded_element=Ristretto255.from_bytes(registration_request_raw))

    def deserialize_registration_response(self, registration_response_raw: bytes) -> RegistrationResponse:
        """
        Deserializes a registration response from raw bytes.

        :param registration_response_raw: the raw bytes of the registration response
        :return: the deserialized registration response
        """

        evaluated_element_raw = registration_response_raw[: Ristretto255.KEY_LENGTH]
        server_public_key_raw = registration_response_raw[Ristretto255.KEY_LENGTH : self.registration_response_size]

        return RegistrationResponse(
            evaluated_element=Ristretto255.from_bytes(evaluated_element_raw),
            server_public_key=Ristretto255.from_bytes(server_public_key_raw),
        )

    def deserialize_registration_record(self, registration_record_raw: bytes) -> RegistrationRecord:
        """
        Deserializes a registration record from raw bytes.

        :param registration_record_raw: the raw bytes of the registration record
        :return: the deserialized registration record
        """

        client_public_key = Ristretto255.from_bytes(registration_record_raw[: Ristretto255.KEY_LENGTH])
        masking_key = registration_record_raw[Ristretto255.KEY_LENGTH : Ristretto255.KEY_LENGTH + self.kdf.digest_size]
        envelope = Envelope.deserialize(
            registration_record_raw[Ristretto255.KEY_LENGTH + self.kdf.digest_size :], self.NONCE_LENGTH
        )
        return RegistrationRecord(client_public_key=client_public_key, masking_key=masking_key, envelope=envelope)

    def deserialize_ke1(self, ke1_raw: bytes) -> KE1:
        """
        Deserializes a KE1 message from raw bytes.

        :param ke1_raw: the raw bytes of the KE1 message
        :return: the deserialized KE1 message
        """

        # The first part is the credential request, which consists of the OPRF blinded message
        blinded_element = Ristretto255.from_bytes(ke1_raw[: Ristretto255.KEY_LENGTH])
        credential_request = CredentialRequest(blinded_element=blinded_element)

        # Then we have the auth request, consisting of a client nonce and public keyshare
        client_nonce = ke1_raw[Ristretto255.KEY_LENGTH : Ristretto255.KEY_LENGTH + self.NONCE_LENGTH]
        client_public_keyshare = Ristretto255.from_bytes(
            ke1_raw[Ristretto255.KEY_LENGTH + self.NONCE_LENGTH : self.ke1_size]
        )
        auth_request = AuthRequest(client_nonce=client_nonce, client_public_keyshare=client_public_keyshare)

        return KE1(credential_request=credential_request, auth_request=auth_request)

    def deserialize_ke3(self, ke3_raw: bytes) -> KE3:
        """
        Deserializes a KE3 message from raw bytes.

        :param ke3_raw: the raw bytes of the KE3 message
        :return: the deserialized KE3 message
        """

        return KE3(client_mac=ke3_raw)
