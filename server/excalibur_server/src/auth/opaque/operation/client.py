from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.opaque.operation.base import BaseOPAQUE
from excalibur_server.src.auth.opaque.oprf import OPRFType
from excalibur_server.src.auth.opaque.structures import (
    CleartextCredentials,
    Envelope,
    RegistrationRecord,
    RegistrationRequest,
    RegistrationResponse,
)
from excalibur_server.src.crypto.elliptic import Ristretto255


class OPAQUEClient(BaseOPAQUE):
    """
    Partial client implementation of the OPAQUE protocol as described in
    [RFC9807](https://datatracker.ietf.org/doc/html/rfc9807). Specifically, this only handles the
    registration phase of the protocol.
    """

    def __init__(self, oprf_type: OPRFType = "ristretto255-sha512"):
        super().__init__(oprf_type)

        self._password = None
        self._blind = None
        self._client_secret = None
        self._ke1 = None

    # Helper functions
    def _envelope_computation(
        self,
        randomized_password: bytes,
        server_public_key: Ristretto255,
        server_identity: bytes,
        client_identity: bytes,
        envelope_nonce: bytes | None = None,
    ) -> tuple[Envelope, CleartextCredentials, int, Ristretto255, bytes, bytes]:
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
        server_public_key: Ristretto255,
        server_identity: bytes,
        client_identity: bytes,
        envelope_nonce: bytes | None = None,
    ) -> tuple[Envelope, Ristretto255, bytes, bytes]:
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
