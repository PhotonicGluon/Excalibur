from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.elliptic.abc import BaseCurve
from excalibur_server.src.auth.opaque.misc import xor
from excalibur_server.src.auth.opaque.operation.base import BaseOPAQUE
from excalibur_server.src.auth.opaque.oprf import OPRFType
from excalibur_server.src.auth.opaque.structures import (
    KE1,
    KE2,
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
    def _envelope_computation(
        self,
        randomized_password: bytes,
        server_public_key: BaseCurve,
        server_identity: bytes,
        client_identity: bytes,
        envelope_nonce: bytes | None = None,
    ) -> tuple[Envelope, CleartextCredentials, int, BaseCurve, bytes, bytes]:
        """
        Computes an envelope, following section 4.1.2.

        We differ from the official implementation by returning the client private key and cleartext
        credentials as well. This is to promote code reuse.

        :param randomized_password: a randomized password
        :param server_public_key: the encoded server public key for the AKE protocol
        :param server_identity: the optional encoded server identity
        :param client_identity: the optional encoded client identity
        :param envelope_nonce: optional nonce for the envelope
        :returns: the envelope, cleartext credentials, client's private key, client's public key,
            masking key, and export key
        """

        envelope_nonce = envelope_nonce or get_random_bytes(self.NONCE_LENGTH)

        masking_key = self.kdf.expand(randomized_password, b"MaskingKey", self.kdf.digest_size)
        auth_key = self.kdf.expand(randomized_password, envelope_nonce + b"AuthKey", self.kdf.digest_size)
        export_key = self.kdf.expand(randomized_password, envelope_nonce + b"ExportKey", self.kdf.digest_size)
        seed = self.kdf.expand(randomized_password, envelope_nonce + b"PrivateKey", self.SEED_LENGTH)
        client_private_key, client_public_key = self._derive_diffie_hellman_keypair(seed)

        cleartext_credentials = self._create_cleartext_credentials(
            server_public_key, client_public_key, server_identity, client_identity
        )

        auth_tag = self.kdf.hmac_hash(auth_key, envelope_nonce + cleartext_credentials.serialize())

        envelope = Envelope(envelope_nonce=envelope_nonce, auth_tag=auth_tag)
        return envelope, cleartext_credentials, client_private_key, client_public_key, masking_key, export_key

    def _store(
        self,
        randomized_password: bytes,
        server_public_key: BaseCurve,
        server_identity: bytes,
        client_identity: bytes,
        envelope_nonce: bytes | None = None,
    ) -> tuple[Envelope, BaseCurve, bytes, bytes]:
        """
        Creates an envelope at registration, following section 4.1.2.

        :param randomized_password: a randomized password
        :param server_public_key: the encoded server public key for the AKE protocol
        :param server_identity: the optional encoded server identity
        :param client_identity: the optional encoded client identity
        :param envelope_nonce: optional nonce for the envelope
        :returns: the envelope, client's public key, masking key, and export key
        """

        envelope, _, _, client_public_key, masking_key, export_key = self._envelope_computation(
            randomized_password, server_public_key, server_identity, client_identity, envelope_nonce=envelope_nonce
        )

        return envelope, client_public_key, masking_key, export_key

    def _recover(
        self,
        randomized_password: bytes,
        server_public_key: BaseCurve,
        envelope: Envelope,
        server_identity: bytes,
        client_identity: bytes,
    ) -> tuple[int, CleartextCredentials, bytes]:
        """
        Recovers data from the envelope structure, as described in section 4.1.3.

        :param randomized_password: a randomized password
        :param server_public_key: the encoded server public key for the AKE protocol
        :param envelope: the client's Envelope structure
        :param server_identity: the optional encoded server identity
        :param client_identity: the optional encoded client identity
        :returns: the client's private key, cleartext credentials, and the `export_key`
        :raises ValueError: if the Envelope fails to be recovered
        """

        # The first part of section 4.1.3's code is identical to section 4.1.2, so we can reuse code
        expected_envelope, cleartext_credentials, client_private_key, _, _, export_key = self._envelope_computation(
            randomized_password, server_public_key, server_identity, client_identity, envelope.envelope_nonce
        )

        if envelope.auth_tag != expected_envelope.auth_tag:
            raise ValueError("envelope authentication tag does not match expected tag")

        return client_private_key, cleartext_credentials, export_key

    def _create_credential_request(self, password: bytes, blind: int | None = None) -> tuple[CredentialRequest, int]:
        """
        Create a credential request for the given password, as described in section 6.3.2.1.

        :param password: the password to create a credential request for
        :param blind: optional blind to use for the credential request
        :return: a tuple of the credential request and the blind
        """

        # It turns out this function is exactly the same as the `create_registration_request()` function, so we just
        # reuse it
        registration_request, blind = self.create_registration_request(password, blind=blind)
        return CredentialRequest(blinded_element=registration_request.blinded_element), blind

    def _recover_credentials(
        self, password: bytes, blind: int, response: CredentialResponse, server_identity: bytes, client_identity: bytes
    ) -> tuple[int, CleartextCredentials, bytes]:
        """
        Process the server's `CredentialResponse` message and produce the client's private key,
        server public key, and the `export_key`, as described in section 6.3.2.3.

        :param password: an opaque byte string containing the client's password
        :param blind: OPRF blinding scalar value
        :param response: the server's `CredentialResponse` message
        :param server_identity: optional server's identity
        :param client_identity: the client's identity
        :return: the client's private key, cleartext credentials, and the `export_key`
        """

        evaluated_element = response.evaluated_element

        oprf_output = self.oprf.finalize(password, blind, evaluated_element)
        stretched_oprf_output = self._ksf(oprf_output)

        randomized_password = self.kdf.extract(b"", oprf_output + stretched_oprf_output)

        masking_key = self.kdf.expand(randomized_password, b"MaskingKey", self.kdf.digest_size)

        credential_response_pad = self.kdf.expand(
            masking_key,
            response.masking_nonce + b"CredentialResponsePad",
            self.oprf.Curve.KEY_LENGTH + self.NONCE_LENGTH + self.kdf.digest_size,
        )

        server_public_key_and_envelope = xor(credential_response_pad, response.masked_response)
        server_public_key = self.oprf.Curve.from_bytes(server_public_key_and_envelope[: self.oprf.Curve.KEY_LENGTH])
        envelope = Envelope.deserialize(server_public_key_and_envelope[self.oprf.Curve.KEY_LENGTH :], self.NONCE_LENGTH)

        client_private_key, cleartext_credentials, export_key = self._recover(
            randomized_password, server_public_key, envelope, server_identity, client_identity
        )

        return client_private_key, cleartext_credentials, export_key

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

        secret, public_keyshare = self._derive_diffie_hellman_keypair(keyshare_seed)

        auth_request = AuthRequest(client_nonce=nonce, client_public_keyshare=public_keyshare)
        ke1 = KE1(credential_request=credential_request, auth_request=auth_request)

        self._client_secret = secret
        self._ke1 = ke1
        return ke1

    def _auth_client_finalize(
        self, cleartext_credentials: CleartextCredentials, client_private_key: int, ke2: KE2
    ) -> tuple[KE3, bytes]:
        """
        Create a KE3 message and output session_key using the server's KE2 message and recovered
        credential information, as described in section 6.4.3.

        :param cleartext_credentials: a CleartextCredentials structure
        :param client_private_key: the client's private key
        :param ke2: a KE2 message structure
        :return: the KE3 message to send to the server and the shared session secret
        :raises ValueError: if the server authentication fails
        """

        dh1 = self._diffie_hellman(self._client_secret, ke2.auth_response.server_public_keyshare)
        dh2 = self._diffie_hellman(self._client_secret, cleartext_credentials.server_public_key)
        dh3 = self._diffie_hellman(client_private_key, ke2.auth_response.server_public_keyshare)
        ikm = dh1.to_bytes() + dh2.to_bytes() + dh3.to_bytes()

        preamble = self._generate_preamble(
            cleartext_credentials.client_identity,
            self._ke1,
            cleartext_credentials.server_identity,
            ke2.credential_response,
            ke2.auth_response.server_nonce,
            ke2.auth_response.server_public_keyshare,
        )
        km2, km3, session_key = self._derive_keys(ikm, preamble)
        expected_server_mac = self.kdf.hmac_hash(km2, self._hash(preamble))

        if ke2.auth_response.server_mac != expected_server_mac:
            raise ValueError("failed to authenticate server")

        client_mac = self.kdf.hmac_hash(km3, self._hash(preamble + expected_server_mac))
        return KE3(client_mac=client_mac), session_key

    # Main functions
    def create_registration_request(self, password: bytes, blind: int | None = None) -> tuple[RegistrationRequest, int]:
        """
        Create a registration request to send to the server, following section 5.2.1.

        :param password: the password to use for the registration
        :param blind: optional blind to use for the registration
        :return: a tuple containing the registration request and the blind used for the registration
        """

        blind, blinded_element = self.oprf.blind(password, blind)
        return RegistrationRequest(blinded_element=blinded_element), blind

    def finalize_registration_request(
        self,
        password: bytes,
        blind: int,
        response: RegistrationResponse,
        server_identity: bytes,
        client_identity: bytes,
        envelope_nonce: bytes | None = None,
    ) -> tuple[RegistrationRecord, bytes]:
        """
        Finalizes the registration request and generates the registration record for the server to
        keep, following section 5.2.3.

        :param password: the password to use for the registration
        :param blind: the blind used for the registration
        :param response: the response from the server
        :param server_identity: the server identity
        :param client_identity: the client identity
        :param envelope_nonce: optional nonce to use for the envelope
        :return: a tuple containing the registration record and the export key
        """

        evaluated_element = response.evaluated_element

        oprf_output = self.oprf.finalize(password, blind, evaluated_element)
        stretched_oprf_output = self._ksf(oprf_output)

        randomized_password = self.kdf.extract(b"", oprf_output + stretched_oprf_output)

        envelope, client_public_key, masking_key, export_key = self._store(
            randomized_password,
            response.server_public_key,
            server_identity,
            client_identity,
            envelope_nonce=envelope_nonce,
        )

        record = RegistrationRecord(client_public_key=client_public_key, masking_key=masking_key, envelope=envelope)
        return record, export_key

    def generate_ke1(
        self, password: bytes, blind: int | None = None, nonce: bytes | None = None, keyshare_seed: bytes | None = None
    ) -> KE1:
        """
        Generate the KE1 message to send to the server.

        :param password: the password to use for the authentication
        :param blind: optional blind to use for the authentication
        :param nonce: optional nonce to use for the authentication
        :param keyshare_seed: optional keyshare seed to use for the authentication
        :return: the client's KE1 message
        """

        request, blind = self._create_credential_request(password, blind=blind)
        self._password = password
        self._blind = blind
        ke1 = self._auth_client_start(request, nonce=nonce, keyshare_seed=keyshare_seed)
        return ke1

    def generate_ke3(self, client_identity: bytes, server_identity: bytes, ke2: KE2) -> tuple[KE3, bytes, bytes]:
        """
        Generate the KE3 message to send to the client.

        :param client_identity: the client's identity
        :param server_identity: the server's identity
        :param ke2: the KE2 message from the server
        :return: the client's KE3 message, the session key, and the export key
        """

        client_private_key, cleartext_credentials, export_key = self._recover_credentials(
            self._password, self._blind, ke2.credential_response, server_identity, client_identity
        )
        ke3, session_key = self._auth_client_finalize(cleartext_credentials, client_private_key, ke2)
        return ke3, session_key, export_key
