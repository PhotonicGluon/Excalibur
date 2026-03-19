import hmac

from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.elliptic.abc import BaseCurve
from excalibur_server.src.auth.opaque.hkdf import HKDF
from excalibur_server.src.auth.opaque.misc import i2osp, xor
from excalibur_server.src.auth.opaque.oprf import OPRFDecaf, OPRFRistretto, OPRFType
from excalibur_server.src.auth.opaque.structures import (
    KE1,
    KE2,
    AuthRequest,
    AuthResponse,
    CleartextCredentials,
    CredentialRequest,
    CredentialResponse,
    RegistrationRecord,
)


class BaseOPAQUE:
    """
    Base class for the OPAQUE protocol implementation as described in
    [RFC9807](https://www.rfc-editor.org/rfc/rfc9807).
    """

    NONCE_LENGTH = 32  # See section 2
    SEED_LENGTH = 32  # See section 2
    MAC_LENGTH = 64  # We'll use HMAC-SHA256, which has a 64-byte MAC

    def __init__(self, oprf_type: OPRFType = "decaf448-shake256", context: bytes = b"Excalibur") -> None:
        self.context = context

        if oprf_type == "decaf448-shake256":
            self._oprf = OPRFDecaf
            self._kdf = HKDF("shake256")
        elif oprf_type == "ristretto255-sha512":
            self._oprf = OPRFRistretto
            self._kdf = HKDF("sha512")

    # Helper methods
    def _mac(self, key: bytes, msg: bytes) -> bytes:
        """
        Implements the `MAC()` function described in section 2.2.
        """

        return hmac.new(key, msg, self._kdf.hash_name).digest()

    def _hash(self, data: bytes) -> bytes:
        """
        Implements the `Hash()` function described in section 2.3.

        :param data: the data to hash
        :return: the hash of the data
        """

        return self._oprf.hashfunc(data).digest()

    def _derive_diffie_hellman_keyshare(self, seed: bytes) -> tuple[int, BaseCurve]:
        """
        Derive a Diffie-Hellman keypair from a seed, as described in section 6.4.1.1.

        :param seed: the seed to derive the keypair from
        :return: a tuple of the private key and the public key
        """

        return self._oprf.generate_keys(seed, b"OPAQUE-DeriveDiffieHellmanKeyPair")

    def _diffie_hellman(self, k: int, b: BaseCurve) -> BaseCurve:
        """
        Performs the Diffie-Hellman operation between the private input `k` and public input `b`, as
        described in section 6.4.1.1.

        We differ from the specification by returning the base curve element instead of its
        serialized form.

        :param k: the private key
        :param b: the public key
        :return: the shared secret
        """

        return k * b

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
        custom_label = (
            length.to_bytes(2, "big")
            + len(opaque_label).to_bytes(1, "big")
            + opaque_label
            + len(context).to_bytes(1, "big")
            + context
        )

        return self._kdf.expand(
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

        return self._expand_label(secret, label, transcript_hash, self._kdf.digest_size)

    def _generate_preamble(
        self,
        client_identity: bytes,
        ke1: KE1,
        server_identity: bytes,
        credential_response: CredentialResponse,
        server_nonce: bytes,
        server_public_keyshare: BaseCurve,
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

        prk = self._kdf.extract(b"", ikm)

        preamble_hash = self._hash(preamble)
        handshake_secret = self._derive_secret(prk, b"HandshakeSecret", preamble_hash)
        session_key = self._derive_secret(prk, b"SessionKey", preamble_hash)
        km2 = self._derive_secret(handshake_secret, b"ServerMAC", b"")
        km3 = self._derive_secret(handshake_secret, b"ClientMAC", b"")

        return km2, km3, session_key

    def _deserialize_ke1(self, ke1_raw: bytes) -> KE1:
        """
        Deserializes a KE1 message from raw bytes.

        :param ke1_raw: the raw bytes of the KE1 message
        :return: the deserialized KE1 message
        """

        # The first part is the credential request, which consists of the OPRF blinded message
        blinded_element = self._oprf.Curve.from_bytes(ke1_raw[: self._oprf.Curve.KEY_LENGTH])
        credential_request = CredentialRequest(blinded_element=blinded_element)

        # Then we have the auth request, consisting of a client nonce and public keyshare
        client_nonce = ke1_raw[self._oprf.Curve.KEY_LENGTH : self._oprf.Curve.KEY_LENGTH + self.NONCE_LENGTH]
        client_public_keyshare = self._oprf.Curve.from_bytes(ke1_raw[self._oprf.Curve.KEY_LENGTH + self.NONCE_LENGTH :])
        auth_request = AuthRequest(client_nonce=client_nonce, client_public_keyshare=client_public_keyshare)

        return KE1(credential_request=credential_request, auth_request=auth_request)


class OPAQUEClient(BaseOPAQUE):
    """
    Client implementation of the OPAQUE protocol as described in
    [RFC9807](https://www.rfc-editor.org/rfc/rfc9807).
    """

    def __init__(self, oprf_type: OPRFType = "decaf448-shake256"):
        super().__init__(oprf_type)

        self._password = None
        self._blind = None
        self._client_secret = None
        self._ke1 = None

    # Helper functions
    def _create_credential_request(self, password: bytes, blind: int | None = None) -> tuple[CredentialRequest, bytes]:
        """
        Create a credential request for the given password, as described in section 6.3.2.1.

        :param password: the password to create a credential request for
        :param blind: optional blind to use for the credential request
        :return: a tuple of the credential request and the blind
        """

        blind, blinded_element = self._oprf.blind(password, blind)
        return CredentialRequest(blinded_element=blinded_element), blind

    def _auth_client_start(
        self, credential_request: CredentialRequest, nonce: bytes | None = None, keyshare_seed: bytes | None = None
    ) -> KE1:
        """
        Start the authentication process, as described in section 6.4.3.

        :param credential_request: the credential request to start the authentication with
        :param nonce: optional nonce to use for the authentication
        :param keyshare_seed: optional keyshare seed to use for the authentication
        :return: the KE1 message to send to the server
        """

        nonce = nonce or get_random_bytes(self.NONCE_LENGTH)
        keyshare_seed = keyshare_seed or get_random_bytes(self.SEED_LENGTH)

        secret, public_keyshare = self._derive_diffie_hellman_keyshare(keyshare_seed)

        auth_request = AuthRequest(client_nonce=nonce, client_public_keyshare=public_keyshare)
        ke1 = KE1(credential_request=credential_request, auth_request=auth_request)

        self._client_secret = secret
        self._ke1 = ke1
        return ke1

    # Main functions
    def generate_ke1(
        self, password: bytes, blind: int | None = None, nonce: bytes | None = None, keyshare_seed: bytes | None = None
    ) -> KE1:
        request, blind = self._create_credential_request(password, blind=blind)
        self._password = password
        self._blind = blind
        ke1 = self._auth_client_start(request, nonce=nonce, keyshare_seed=keyshare_seed)
        return ke1


class OPAQUEServer(BaseOPAQUE):
    """
    Server implementation of the OPAQUE protocol as described in
    [RFC9807](https://www.rfc-editor.org/rfc/rfc9807).
    """

    def __init__(self, oprf_type: OPRFType = "decaf448-shake256"):
        super().__init__(oprf_type)

        self._expected_client_mac = None
        self._session_key = None

    # Helper functions
    def _create_cleartext_credentials(
        self,
        server_public_key: BaseCurve,
        client_public_key: BaseCurve,
        server_identity: bytes | None = None,
        client_identity: bytes | None = None,
    ):
        """
        Create cleartext credentials for the server, following section 4's
        `CreateCleartextCredentials()` function.

        :param server_public_key: the server's public key
        :param client_public_key: the client's public key
        :param server_identity: the server's identity
        :param client_identity: the client's identity
        :return: the cleartext credentials
        """

        if server_identity is None:
            server_identity = server_public_key
        if client_identity is None:
            client_identity = client_public_key.to_bytes()

        cleartext_credentials = CleartextCredentials(
            server_public_key=server_public_key,
            server_identity=server_identity,
            client_identity=client_identity,
        )
        return cleartext_credentials

    def _create_credential_response(
        self,
        request: CredentialRequest,
        server_public_key: BaseCurve,
        record: RegistrationRecord,
        credential_identifier: bytes,  # TODO: Do we need this?
        oprf_seed: bytes,
        masking_nonce: bytes | None = None,
    ) -> CredentialResponse:
        """
        Create a credential response for the given credential request, following section 6.3.2.2.

        :param request: the credential request
        :param server_public_key: the server's public key
        :param record: the registration record
        :param credential_identifier: the credential identifier
        :param oprf_seed: the OPRF seed
        :param masking_nonce: optional masking nonce
        :return: the credential response
        """

        seed = self._kdf.expand(oprf_seed, credential_identifier + b"OprfKey", self._oprf.Curve.KEY_LENGTH)
        oprf_key, _ = self._oprf.generate_keys(seed=seed, info=b"OPAQUE-DeriveKeyPair")

        blinded_element = request.blinded_element
        evaluated_element = self._oprf.blind_evaluate(oprf_key, blinded_element)

        masking_nonce = masking_nonce or get_random_bytes(self.NONCE_LENGTH)
        credential_response_pad = self._kdf.expand(
            record.masking_key,
            masking_nonce + b"CredentialResponsePad",
            self._oprf.Curve.KEY_LENGTH + self.NONCE_LENGTH + self.MAC_LENGTH,
        )
        masked_response = xor(credential_response_pad, server_public_key.to_bytes() + record.envelope.serialize())

        response = CredentialResponse(
            evaluated_element=evaluated_element, masking_nonce=masking_nonce, masked_response=masked_response
        )

        return response

    def _auth_server_respond(
        self,
        cleartext_credentials: CleartextCredentials,
        server_private_key: int,
        client_public_key: BaseCurve,
        ke1: KE1,
        credential_response: CredentialResponse,
        nonce: bytes | None = None,
        keyshare_seed: bytes | None = None,
    ) -> AuthResponse:
        """
        Processes the client's `KE1` message and public credential information to create a `KE2`
        message, following section 6.4.4.

        :param cleartext_credentials: the cleartext credentials
        :param server_private_key: the server's private key
        :param client_public_key: the client's public key
        :param ke1: the client's KE1 message
        :param credential_response: the credential response
        :param nonce: optional server's nonce
        :param keyshare_seed: optional server's keyshare seed
        :return: the authentication response structure
        """

        nonce = nonce or get_random_bytes(self.NONCE_LENGTH)
        keyshare_seed = keyshare_seed or get_random_bytes(self.SEED_LENGTH)

        private_keyshare, public_keyshare = self._derive_diffie_hellman_keyshare(keyshare_seed)

        preamble = self._generate_preamble(
            cleartext_credentials.client_identity,
            ke1,
            cleartext_credentials.server_identity,
            credential_response,
            nonce,
            public_keyshare,
        )

        dh1 = self._diffie_hellman(private_keyshare, ke1.auth_request.client_public_keyshare)
        dh2 = self._diffie_hellman(server_private_key, ke1.auth_request.client_public_keyshare)
        dh3 = self._diffie_hellman(private_keyshare, client_public_key)
        ikm = dh1.to_bytes() + dh2.to_bytes() + dh3.to_bytes()

        km2, km3, session_key = self._derive_keys(ikm, preamble)
        print("km2:", km2.hex())
        print("session_key:", session_key.hex())
        mac = self._mac(km2, self._hash(preamble))

        self._expected_client_mac = self._mac(km3, self._hash(preamble + mac))
        self._session_key = session_key

        return AuthResponse(server_nonce=nonce, server_public_keyshare=public_keyshare, server_mac=mac)

    # Main functions
    def generate_ke2(
        self,
        server_identity: bytes,
        server_private_key: int,
        server_public_key: BaseCurve,
        record: RegistrationRecord,
        credential_identifier: bytes,
        oprf_seed: bytes,
        ke1: KE1,
        client_identity: bytes,
        masking_nonce: bytes | None = None,
        nonce: bytes | None = None,
        keyshare_seed: bytes | None = None,
    ):
        """
        Continues the AKE protocol by processing the client's `KE1` message and producing the
        server's `KE2` output, following section 6.2.2.

        :param server_identity: the server's identity
        :param server_private_key: the server's private key
        :param server_public_key: the server's public key
        :param record: the registration record
        :param credential_identifier: the credential identifier
        :param oprf_seed: the OPRF seed
        :param ke1: the client's KE1 message
        :param client_identity: the client's identity
        :param masking_nonce: optional masking nonce
        :param nonce: optional server's nonce
        :param keyshare_seed: optional server's keyshare seed
        :return: the server's KE2 message
        """

        # Set identities to public keys if not specified
        if server_identity == b"":
            server_identity = server_public_key.to_bytes()
        if client_identity == b"":
            client_identity = record.client_public_key.to_bytes()

        # Carry on with the rest of section 6.2.2 processes
        credential_response = self._create_credential_response(
            ke1.credential_request,
            server_public_key,
            record,
            credential_identifier,
            oprf_seed,
            masking_nonce=masking_nonce,
        )
        cleartext_credentials = self._create_cleartext_credentials(
            server_public_key, record.client_public_key, server_identity, client_identity
        )

        auth_response = self._auth_server_respond(
            cleartext_credentials,
            server_private_key,
            record.client_public_key,
            ke1,
            credential_response,
            nonce=nonce,
            keyshare_seed=keyshare_seed,
        )

        return KE2(credential_response=credential_response, auth_response=auth_response)
