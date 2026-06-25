import pytest

from excalibur_server.src.auth.opaque.operation import OPAQUEClient, OPAQUEServer
from excalibur_server.src.auth.opaque.operation.base import OPAQUEAuthError, OPAQUEClientAuthError
from excalibur_server.src.auth.opaque.structures import Envelope, RegistrationRecord
from excalibur_server.src.crypto.ristretto255 import Ristretto255


class TestOPAQUEValidationTests:
    def test_reject_dh_point_at_infinity(self):
        with pytest.raises(OPAQUEAuthError):
            OPAQUEClient()._diffie_hellman(0, Ristretto255.GENERATOR)

        with pytest.raises(OPAQUEAuthError):
            OPAQUEClient()._diffie_hellman(1337, Ristretto255.IDENTITY)


class TestOPAQUERistretto255:
    # Test vectors from RFC9807, Appendix C.1.1 and C.1.2
    CONTEXTS_RAW = [
        "4f50415155452d504f43",
        "4f50415155452d504f43",
    ]
    CLIENT_IDENTITIES_RAW = [
        "",  # Blank, should use client's public key
        "616c696365",
    ]
    SERVER_IDENTITIES_RAW = [
        "",  # Blank, should use server's public key
        "626f62",
    ]
    OPRF_SEEDS_RAW = [
        "f433d0227b0b9dd54f7c4422b600e764e47fb503f1f9a0f0a47c6606b054a7fdc65347f1a08f277e22358bbabe26f823fca82c7848e9a75661f4ec5d5c1989ef",
        "f433d0227b0b9dd54f7c4422b600e764e47fb503f1f9a0f0a47c6606b054a7fdc65347f1a08f277e22358bbabe26f823fca82c7848e9a75661f4ec5d5c1989ef",
    ]
    CREDENTIAL_IDENTIFIERS_RAW = [
        "31323334",
        "31323334",
    ]
    PASSWORDS_RAW = [
        "436f7272656374486f72736542617474657279537461706c65",
        "436f7272656374486f72736542617474657279537461706c65",
    ]
    ENVELOPE_NONCES_RAW = [
        "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec",
        "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec",
    ]
    MASKING_NONCES_RAW = [
        "38fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6d",
        "38fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6d",
    ]
    SERVER_PRIVATE_KEYS_RAW = [
        "47451a85372f8b3537e249d7b54188091fb18edde78094b43e2ba42b5eb89f0d",
        "47451a85372f8b3537e249d7b54188091fb18edde78094b43e2ba42b5eb89f0d",
    ]
    SERVER_PUBLIC_KEYS_RAW = [
        "b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
        "b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
    ]
    SERVER_NONCES_RAW = [
        "71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1",
        "71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1",
    ]
    CLIENT_NONCES_RAW = [
        "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
        "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
    ]
    CLIENT_KEYSHARE_SEEDS_RAW = [
        "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
        "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
    ]
    SERVER_KEYSHARE_SEEDS_RAW = [
        "05a4f54206eef1ba2f615bc0aa285cb22f26d1153b5b40a1e85ff80da12f982f",
        "05a4f54206eef1ba2f615bc0aa285cb22f26d1153b5b40a1e85ff80da12f982f",
    ]
    BLIND_REGISTRATIONS_RAW = [
        "76cfbfe758db884bebb33582331ba9f159720ca8784a2a070a265d9c2d6abe01",
        "76cfbfe758db884bebb33582331ba9f159720ca8784a2a070a265d9c2d6abe01",
    ]
    BLIND_LOGINS_RAW = [
        "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
        "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
    ]

    CLIENT_PUBLIC_KEYS_RAW = [
        "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c3675",
        "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c3675",
    ]
    RANDOMIZED_PASSWORDS_RAW = [
        "aac48c25ab036e30750839d31d6e73007344cb1155289fb7d329beb932e9adeea73d5d5c22a0ce1952f8aba6d66007615cd1698d4ac85ef1fcf150031d1435d9",
        "aac48c25ab036e30750839d31d6e73007344cb1155289fb7d329beb932e9adeea73d5d5c22a0ce1952f8aba6d66007615cd1698d4ac85ef1fcf150031d1435d9",
    ]
    ENVELOPES_RAW = [
        "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec634b0f5b96109c198a8027da51854c35bee90d1e1c781806d07d49b76de6a28b8d9e9b6c93b9f8b64d16dddd9c5bfb5fea48ee8fd2f75012a8b308605cdd8ba5",
        "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec1ac902dc5589e9a5f0de56ad685ea8486210ef41449cd4d8712828913c5d2b680b2b3af4a26c765cff329bfb66d38ecf1d6cfa9e7a73c222c6efe0d9520f7d7c",
    ]

    REGISTRATION_REQUESTS_RAW = [
        "5059ff249eb1551b7ce4991f3336205bde44a105a032e747d21bf382e75f7a71",
        "5059ff249eb1551b7ce4991f3336205bde44a105a032e747d21bf382e75f7a71",
    ]
    REGISTRATION_RESPONSES_RAW = [
        "7408a268083e03abc7097fc05b587834539065e86fb0c7b6342fcf5e01e5b019b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
        "7408a268083e03abc7097fc05b587834539065e86fb0c7b6342fcf5e01e5b019b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
    ]
    REGISTRATION_UPLOADS_RAW = [
        "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c36751ac5844383c7708077dea41cbefe2fa15724f449e535dd7dd562e66f5ecfb95864eadddec9db5874959905117dad40a4524111849799281fefe3c51fa82785c5ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec634b0f5b96109c198a8027da51854c35bee90d1e1c781806d07d49b76de6a28b8d9e9b6c93b9f8b64d16dddd9c5bfb5fea48ee8fd2f75012a8b308605cdd8ba5",
        "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c36751ac5844383c7708077dea41cbefe2fa15724f449e535dd7dd562e66f5ecfb95864eadddec9db5874959905117dad40a4524111849799281fefe3c51fa82785c5ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec1ac902dc5589e9a5f0de56ad685ea8486210ef41449cd4d8712828913c5d2b680b2b3af4a26c765cff329bfb66d38ecf1d6cfa9e7a73c222c6efe0d9520f7d7c",
    ]
    KE1_RAW = [
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
    ]
    KE2_RAW = [
        "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fedc80188ca46743c52786e0382f95ad85c08f6afcd1ccfbff95e2bdeb015b166c6b20b92f832cc6df01e0b86a7efd92c1c804ff865781fa93f2f20b446c8371b671cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a660c48dae03e57aaa38f3d0cffcfc21852ebc8b405d15bd6744945ba1a93438a162b6111699d98a16bb55b7bdddfe0fc5608b23da246e7bd73b47369169c5c90",
        "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fea502150b67fe36795dd8914f164e49f81c7688a38928372134b7dccd50e09f8fed9518b7b2f94835b3c4fe4c8475e7513f20eb97ff0568a39caee3fd6251876f71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a292371e7809a9031743e943fb3b56f51de903552fc91fba4e7419029951c3970b2e2f0a9dea218d22e9e4e0000855bb6421aa3610d6fc0f4033a6517030d4341",
    ]
    KE3_RAW = [
        "4455df4f810ac31a6748835888564b536e6da5d9944dfea9e34defb9575fe5e2661ef61d2ae3929bcf57e53d464113d364365eb7d1a57b629707ca48da18e442",
        "7a026de1d6126905736c3f6d92463a08d209833eb793e46d0f7f15b3e0f62c7643763c02bbc6b8d3d15b63250cae98171e9260f1ffa789750f534ac11a0176d5",
    ]
    EXPORT_KEYS_RAW = [
        "1ef15b4fa99e8a852412450ab78713aad30d21fa6966c9b8c9fb3262a970dc62950d4dd4ed62598229b1b72794fc0335199d9f7fcc6eaedde92cc04870e63f16",
        "1ef15b4fa99e8a852412450ab78713aad30d21fa6966c9b8c9fb3262a970dc62950d4dd4ed62598229b1b72794fc0335199d9f7fcc6eaedde92cc04870e63f16",
    ]
    SESSION_KEYS_RAW = [
        "42afde6f5aca0cfa5c163763fbad55e73a41db6b41bc87b8e7b62214a8eedc6731fa3cb857d657ab9b3764b89a84e91ebcb4785166fbb02cedfcbdfda215b96f",
        "ae7951123ab5befc27e62e63f52cf472d6236cb386c968cc47b7e34f866aa4bc7638356a73cfce92becf39d6a7d32a1861f12130e824241fe6cab34fbd471a57",
    ]

    CONTEXTS = [bytes.fromhex(context) for context in CONTEXTS_RAW]
    OPRF_SEEDS = [bytes.fromhex(seed) for seed in OPRF_SEEDS_RAW]
    CREDENTIAL_IDENTIFIERS = [bytes.fromhex(identifier) for identifier in CREDENTIAL_IDENTIFIERS_RAW]
    CLIENT_IDENTITIES = [bytes.fromhex(identity) for identity in CLIENT_IDENTITIES_RAW]
    SERVER_IDENTITIES = [bytes.fromhex(identity) for identity in SERVER_IDENTITIES_RAW]
    PASSWORDS = [bytes.fromhex(password) for password in PASSWORDS_RAW]
    ENVELOPE_NONCES = [bytes.fromhex(nonce) for nonce in ENVELOPE_NONCES_RAW]
    MASKING_NONCES = [bytes.fromhex(nonce) for nonce in MASKING_NONCES_RAW]
    SERVER_PRIVATE_KEYS = [int.from_bytes(bytes.fromhex(key), "little") for key in SERVER_PRIVATE_KEYS_RAW]
    SERVER_PUBLIC_KEYS = [Ristretto255.from_bytes(bytes.fromhex(key)) for key in SERVER_PUBLIC_KEYS_RAW]
    SERVER_NONCES = [bytes.fromhex(nonce) for nonce in SERVER_NONCES_RAW]
    CLIENT_NONCES = [bytes.fromhex(nonce) for nonce in CLIENT_NONCES_RAW]
    CLIENT_KEYSHARE_SEEDS = [bytes.fromhex(seed) for seed in CLIENT_KEYSHARE_SEEDS_RAW]
    SERVER_KEYSHARE_SEEDS = [bytes.fromhex(seed) for seed in SERVER_KEYSHARE_SEEDS_RAW]
    BLIND_REGISTRATIONS = [int.from_bytes(bytes.fromhex(blind), "little") for blind in BLIND_REGISTRATIONS_RAW]
    BLIND_LOGINS = [int.from_bytes(bytes.fromhex(blind), "little") for blind in BLIND_LOGINS_RAW]

    CLIENT_PUBLIC_KEYS = [Ristretto255.from_bytes(bytes.fromhex(key)) for key in CLIENT_PUBLIC_KEYS_RAW]
    RANDOMIZED_PASSWORDS = [bytes.fromhex(password) for password in RANDOMIZED_PASSWORDS_RAW]
    ENVELOPES = [bytes.fromhex(envelope) for envelope in ENVELOPES_RAW]

    REGISTRATION_REQUESTS = [bytes.fromhex(request) for request in REGISTRATION_REQUESTS_RAW]
    REGISTRATION_RESPONSES = [bytes.fromhex(response) for response in REGISTRATION_RESPONSES_RAW]
    REGISTRATION_UPLOADS = [bytes.fromhex(upload) for upload in REGISTRATION_UPLOADS_RAW]
    KE1 = [bytes.fromhex(ke1) for ke1 in KE1_RAW]
    KE2 = [bytes.fromhex(ke2) for ke2 in KE2_RAW]
    KE3 = [bytes.fromhex(ke3) for ke3 in KE3_RAW]
    EXPORT_KEYS = [bytes.fromhex(export_key) for export_key in EXPORT_KEYS_RAW]
    SESSION_KEYS = [bytes.fromhex(session_key) for session_key in SESSION_KEYS_RAW]

    @pytest.fixture
    def opaque_client(self):
        return OPAQUEClient(oprf_type="ristretto255-sha512")

    @pytest.fixture
    def opaque_server(self):
        return OPAQUEServer(oprf_type="ristretto255-sha512")

    # Registration tests
    @pytest.mark.parametrize("test_idx", range(len(REGISTRATION_REQUESTS)))
    def test_registration_request(self, test_idx, opaque_client: OPAQUEClient):
        our_request, our_blind = opaque_client.create_registration_request(
            password=self.PASSWORDS[test_idx],
            # Parameters specified for tests
            blind=self.BLIND_REGISTRATIONS[test_idx],
        )

        assert our_blind == self.BLIND_REGISTRATIONS[test_idx]
        assert our_request.serialize() == self.REGISTRATION_REQUESTS[test_idx]
        assert opaque_client.deserialize_registration_request(self.REGISTRATION_REQUESTS[test_idx]) == our_request

    @pytest.mark.parametrize("test_idx", range(len(REGISTRATION_RESPONSES)))
    def test_registration_responses(self, test_idx, opaque_server: OPAQUEServer):
        request = opaque_server.deserialize_registration_request(self.REGISTRATION_REQUESTS[test_idx])

        our_response = opaque_server.create_registration_response(
            request=request,
            server_public_key=self.SERVER_PUBLIC_KEYS[test_idx],
            credential_identifier=self.CREDENTIAL_IDENTIFIERS[test_idx],
            oprf_seed=self.OPRF_SEEDS[test_idx],
        )
        assert our_response.serialize() == self.REGISTRATION_RESPONSES[test_idx]
        assert opaque_server.deserialize_registration_response(self.REGISTRATION_RESPONSES[test_idx]) == our_response

    @pytest.mark.parametrize("test_idx", range(len(REGISTRATION_REQUESTS)))
    def test_registration_upload(self, test_idx, opaque_client: OPAQUEClient):
        our_record, our_export_key = opaque_client.finalize_registration_request(
            password=self.PASSWORDS[test_idx],
            blind=self.BLIND_REGISTRATIONS[test_idx],
            response=opaque_client.deserialize_registration_response(self.REGISTRATION_RESPONSES[test_idx]),
            server_identity=self.SERVER_IDENTITIES[test_idx],
            client_identity=self.CLIENT_IDENTITIES[test_idx],
            # Parameters specified for tests
            envelope_nonce=self.ENVELOPE_NONCES[test_idx],
        )

        assert our_export_key == self.EXPORT_KEYS[test_idx]
        assert our_record.serialize() == self.REGISTRATION_UPLOADS[test_idx]
        assert opaque_client.deserialize_registration_record(self.REGISTRATION_UPLOADS[test_idx]) == our_record

    # Authenticated key exchange tests
    @pytest.mark.parametrize("test_idx", range(len(KE2)))
    def test_ke2(self, test_idx, opaque_server: OPAQUEServer):
        opaque_server.context = self.CONTEXTS[test_idx]
        masking_key = opaque_server.kdf.expand(
            self.RANDOMIZED_PASSWORDS[test_idx], b"MaskingKey", opaque_server.kdf.digest_size
        )

        our_ke2 = opaque_server.generate_ke2(
            server_identity=self.SERVER_IDENTITIES[test_idx],
            server_private_key=self.SERVER_PRIVATE_KEYS[test_idx],
            server_public_key=self.SERVER_PUBLIC_KEYS[test_idx],
            record=RegistrationRecord(
                client_public_key=self.CLIENT_PUBLIC_KEYS[test_idx],
                masking_key=masking_key,
                envelope=Envelope.deserialize(self.ENVELOPES[test_idx], nonce_length=opaque_server.NONCE_LENGTH),
            ),
            credential_identifier=self.CREDENTIAL_IDENTIFIERS[test_idx],
            oprf_seed=self.OPRF_SEEDS[test_idx],
            ke1=opaque_server.deserialize_ke1(self.KE1[test_idx]),
            client_identity=self.CLIENT_IDENTITIES[test_idx],
            # Parameters specified for tests
            masking_nonce=self.MASKING_NONCES[test_idx],
            nonce=self.SERVER_NONCES[test_idx],
            keyshare_seed=self.SERVER_KEYSHARE_SEEDS[test_idx],
        )

        assert our_ke2.serialize() == self.KE2[test_idx]

    @pytest.mark.parametrize("test_idx", range(len(KE3)))
    def test_server_finish(self, test_idx, opaque_server: OPAQUEServer):
        # Test server setting up and sending KE2
        opaque_server.context = self.CONTEXTS[test_idx]
        masking_key = opaque_server.kdf.expand(
            self.RANDOMIZED_PASSWORDS[test_idx], b"MaskingKey", opaque_server.kdf.digest_size
        )

        opaque_server.generate_ke2(
            server_identity=self.SERVER_IDENTITIES[test_idx],
            server_private_key=self.SERVER_PRIVATE_KEYS[test_idx],
            server_public_key=self.SERVER_PUBLIC_KEYS[test_idx],
            record=RegistrationRecord(
                client_public_key=self.CLIENT_PUBLIC_KEYS[test_idx],
                masking_key=masking_key,
                envelope=Envelope.deserialize(self.ENVELOPES[test_idx], nonce_length=opaque_server.NONCE_LENGTH),
            ),
            credential_identifier=self.CREDENTIAL_IDENTIFIERS[test_idx],
            oprf_seed=self.OPRF_SEEDS[test_idx],
            ke1=opaque_server.deserialize_ke1(self.KE1[test_idx]),
            client_identity=self.CLIENT_IDENTITIES[test_idx],
            # Parameters specified for tests
            masking_nonce=self.MASKING_NONCES[test_idx],
            nonce=self.SERVER_NONCES[test_idx],
            keyshare_seed=self.SERVER_KEYSHARE_SEEDS[test_idx],
        )

        # Check finishing
        ke3 = opaque_server.deserialize_ke3(self.KE3[test_idx])
        our_session_key = opaque_server.finish(ke3)
        assert our_session_key == self.SESSION_KEYS[test_idx]

    # Invalid requests
    @pytest.mark.parametrize("test_idx", range(len(KE3)))
    def test_server_finish_invalid_mac(self, test_idx, opaque_server: OPAQUEServer):
        # Test server setting up and sending KE2
        opaque_server.context = self.CONTEXTS[test_idx]
        masking_key = opaque_server.kdf.expand(
            self.RANDOMIZED_PASSWORDS[test_idx], b"MaskingKey", opaque_server.kdf.digest_size
        )

        opaque_server.generate_ke2(
            server_identity=self.SERVER_IDENTITIES[test_idx],
            server_private_key=self.SERVER_PRIVATE_KEYS[test_idx],
            server_public_key=self.SERVER_PUBLIC_KEYS[test_idx],
            record=RegistrationRecord(
                client_public_key=self.CLIENT_PUBLIC_KEYS[test_idx],
                masking_key=masking_key,
                envelope=Envelope.deserialize(self.ENVELOPES[test_idx], nonce_length=opaque_server.NONCE_LENGTH),
            ),
            credential_identifier=self.CREDENTIAL_IDENTIFIERS[test_idx],
            oprf_seed=self.OPRF_SEEDS[test_idx],
            ke1=opaque_server.deserialize_ke1(self.KE1[test_idx]),
            client_identity=self.CLIENT_IDENTITIES[test_idx],
            # Parameters specified for tests
            masking_nonce=self.MASKING_NONCES[test_idx],
            nonce=self.SERVER_NONCES[test_idx],
            keyshare_seed=self.SERVER_KEYSHARE_SEEDS[test_idx],
        )

        # Test server finishing with invalid MAC
        with pytest.raises(OPAQUEClientAuthError):
            opaque_server.finish(opaque_server.deserialize_ke3(b"\x00" * 32))
