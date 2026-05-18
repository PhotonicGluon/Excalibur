from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.opaque.misc import xor
from excalibur_server.src.auth.opaque.operation.base import BaseOPAQUE, OPAQUEClientAuthError
from excalibur_server.src.auth.opaque.oprf import OPRFType
from excalibur_server.src.auth.opaque.ristretto255 import Ristretto255
from excalibur_server.src.auth.opaque.structures import (
    KE1,
    KE2,
    KE3,
    AuthResponse,
    CleartextCredentials,
    CredentialRequest,
    CredentialResponse,
    RegistrationRecord,
    RegistrationRequest,
    RegistrationResponse,
)


class OPAQUEServer(BaseOPAQUE):
    """
    Server implementation of the OPAQUE protocol as described in
    [RFC9807](https://datatracker.ietf.org/doc/html/rfc9807).
    """

    def __init__(self, oprf_type: OPRFType = "ristretto255-sha512"):
        super().__init__(oprf_type)

        self._expected_client_mac = None
        self._session_key = None

    # Helper functions
    def _create_credential_response(
        self,
        request: CredentialRequest,
        server_public_key: Ristretto255,
        record: RegistrationRecord,
        credential_identifier: bytes,
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

        # The first part is exactly the same as `create_registration_response()`
        registration_response = self.create_registration_response(
            request=request,
            server_public_key=server_public_key,
            credential_identifier=credential_identifier,
            oprf_seed=oprf_seed,
        )

        # We continue with the rest of the credential response creation
        masking_nonce = masking_nonce or get_random_bytes(self.NONCE_LENGTH)
        credential_response_pad = self.kdf.expand(
            record.masking_key,
            masking_nonce + b"CredentialResponsePad",
            Ristretto255.KEY_LENGTH + self.NONCE_LENGTH + self.kdf.digest_size,
        )
        masked_response = xor(credential_response_pad, server_public_key.to_bytes() + record.envelope.serialize())

        response = CredentialResponse(
            evaluated_element=registration_response.evaluated_element,
            masking_nonce=masking_nonce,
            masked_response=masked_response,
        )

        return response

    def _auth_server_respond(
        self,
        cleartext_credentials: CleartextCredentials,
        server_private_key: int,
        client_public_key: Ristretto255,
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
        :raises OPAQUEAuthError: if any of the Diffie-Hellman shared secrets is the point at infinity
        :return: the authentication response structure
        """

        nonce = nonce or get_random_bytes(self.NONCE_LENGTH)
        keyshare_seed = keyshare_seed or get_random_bytes(self.SEED_LENGTH)

        private_keyshare, public_keyshare = self._derive_diffie_hellman_keypair(keyshare_seed)

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
        mac = self.kdf.hmac_hash(km2, self._hash(preamble))

        self._expected_client_mac = self.kdf.hmac_hash(km3, self._hash(preamble + mac))
        self._session_key = session_key

        return AuthResponse(server_nonce=nonce, server_public_keyshare=public_keyshare, server_mac=mac)

    def _auth_server_finalize(self, ke3: KE3) -> bytes:
        """
        Finishes the AKE protocol by processing the client's KE3 message, following section 6.4.4.

        :param ke3: the client's KE3 message
        :return: the session key
        :raises OPAQUEClientAuthError: if the client MAC does not match the expected MAC
        """

        if ke3.client_mac != self._expected_client_mac:
            raise OPAQUEClientAuthError("client MAC does not match expected MAC")

        return self._session_key

    # Main functions
    def create_registration_response(
        self,
        request: RegistrationRequest,
        server_public_key: Ristretto255,
        credential_identifier: bytes,
        oprf_seed: bytes,
    ) -> RegistrationResponse:
        """
        Create a registration response for the given registration request, following section 5.2.2.

        :param request: the registration request
        :param server_public_key: the server's public key
        :param credential_identifier: the credential identifier
        :param oprf_seed: the OPRF seed
        :return: the registration response
        """

        seed = self.kdf.expand(oprf_seed, credential_identifier + b"OprfKey", Ristretto255.KEY_LENGTH)
        oprf_key, _ = self.oprf.generate_keys(seed=seed, info=b"OPAQUE-DeriveKeyPair")

        blinded_element = request.blinded_element
        evaluated_element = self.oprf.blind_evaluate(oprf_key, blinded_element)

        return RegistrationResponse(evaluated_element=evaluated_element, server_public_key=server_public_key)

    def generate_ke2(
        self,
        server_identity: bytes,
        server_private_key: int,
        server_public_key: Ristretto255,
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
        :raises OPAQUEAuthError: if any of the Diffie-Hellman shared secrets is the point at
            infinity
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

    def finish(self, ke3: KE3) -> bytes:
        """
        Finishes the AKE protocol by processing the client's KE3 message.

        :param ke3: the client's KE3 message
        :return: the session key
        :raises OPAQUEClientAuthError: if the client MAC does not match the expected MAC
        """

        return self._auth_server_finalize(ke3)
