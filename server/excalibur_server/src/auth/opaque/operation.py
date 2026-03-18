from Crypto.Random import get_random_bytes

from excalibur_server.src.auth.elliptic.abc import BaseCurve
from excalibur_server.src.auth.opaque.hkdf import HKDF
from excalibur_server.src.auth.opaque.misc import xor
from excalibur_server.src.auth.opaque.oprf import OPRFDecaf, OPRFRistretto, OPRFType
from excalibur_server.src.auth.opaque.structures import (
    KE1,
    AuthRequest,
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

    def __init__(self, oprf_type: OPRFType = "decaf448-shake256") -> None:
        if oprf_type == "decaf448-shake256":
            self._oprf = OPRFDecaf
            self._kdf = HKDF("shake256")
        elif oprf_type == "ristretto255-sha512":
            self._oprf = OPRFRistretto
            self._kdf = HKDF("sha512")


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
        blinded_message = blinded_element.to_bytes()
        return CredentialRequest(blinded_message=blinded_message), blind

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

        secret, public_keyshare = self._oprf.generate_keys(keyshare_seed, b"OPAQUE-DeriveDiffieHellmanKeyPair")

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
