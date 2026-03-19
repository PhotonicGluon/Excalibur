import pytest

from excalibur_server.src.auth.elliptic.ristretto255 import Ristretto255
from excalibur_server.src.auth.opaque.operation import OPAQUEClient, OPAQUEServer
from excalibur_server.src.auth.opaque.structures import Envelope, RegistrationRecord


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

    KE1_RAW = [
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
    ]
    KE2_RAW = [
        "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fedc80188ca46743c52786e0382f95ad85c08f6afcd1ccfbff95e2bdeb015b166c6b20b92f832cc6df01e0b86a7efd92c1c804ff865781fa93f2f20b446c8371b671cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a660c48dae03e57aaa38f3d0cffcfc21852ebc8b405d15bd6744945ba1a93438a162b6111699d98a16bb55b7bdddfe0fc5608b23da246e7bd73b47369169c5c90",
        "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fea502150b67fe36795dd8914f164e49f81c7688a38928372134b7dccd50e09f8fed9518b7b2f94835b3c4fe4c8475e7513f20eb97ff0568a39caee3fd6251876f71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a292371e7809a9031743e943fb3b56f51de903552fc91fba4e7419029951c3970b2e2f0a9dea218d22e9e4e0000855bb6421aa3610d6fc0f4033a6517030d4341",
    ]

    CONTEXTS = [bytes.fromhex(context) for context in CONTEXTS_RAW]
    OPRF_SEEDS = [bytes.fromhex(seed) for seed in OPRF_SEEDS_RAW]
    CREDENTIAL_IDENTIFIERS = [bytes.fromhex(identifier) for identifier in CREDENTIAL_IDENTIFIERS_RAW]
    CLIENT_IDENTITIES = [bytes.fromhex(identity) for identity in CLIENT_IDENTITIES_RAW]
    SERVER_IDENTITIES = [bytes.fromhex(identity) for identity in SERVER_IDENTITIES_RAW]
    PASSWORDS = [bytes.fromhex(password) for password in PASSWORDS_RAW]
    MASKING_NONCES = [bytes.fromhex(nonce) for nonce in MASKING_NONCES_RAW]
    SERVER_PRIVATE_KEYS = [int.from_bytes(bytes.fromhex(key), "little") for key in SERVER_PRIVATE_KEYS_RAW]
    SERVER_PUBLIC_KEYS = [Ristretto255.from_bytes(bytes.fromhex(key)) for key in SERVER_PUBLIC_KEYS_RAW]
    SERVER_NONCES = [bytes.fromhex(nonce) for nonce in SERVER_NONCES_RAW]
    CLIENT_NONCES = [bytes.fromhex(nonce) for nonce in CLIENT_NONCES_RAW]
    CLIENT_KEYSHARE_SEEDS = [bytes.fromhex(seed) for seed in CLIENT_KEYSHARE_SEEDS_RAW]
    SERVER_KEYSHARE_SEEDS = [bytes.fromhex(seed) for seed in SERVER_KEYSHARE_SEEDS_RAW]
    BLIND_LOGINS = [int.from_bytes(bytes.fromhex(blind), "little") for blind in BLIND_LOGINS_RAW]

    CLIENT_PUBLIC_KEYS = [Ristretto255.from_bytes(bytes.fromhex(key)) for key in CLIENT_PUBLIC_KEYS_RAW]
    RANDOMIZED_PASSWORDS = [bytes.fromhex(password) for password in RANDOMIZED_PASSWORDS_RAW]
    ENVELOPES = [bytes.fromhex(envelope) for envelope in ENVELOPES_RAW]

    KE1 = [bytes.fromhex(ke1) for ke1 in KE1_RAW]
    KE2 = [bytes.fromhex(ke2) for ke2 in KE2_RAW]

    @pytest.fixture
    def opaque_client(self):
        return OPAQUEClient(oprf_type="ristretto255-sha512")

    @pytest.fixture
    def opaque_server(self):
        return OPAQUEServer(oprf_type="ristretto255-sha512")

    @pytest.mark.parametrize("test_idx", range(len(KE1)))
    def test_ke1(self, test_idx, opaque_client: OPAQUEClient):
        our_ke1 = opaque_client.generate_ke1(
            password=self.PASSWORDS[test_idx],
            blind=self.BLIND_LOGINS[test_idx],
            # Parameters specified for tests
            nonce=self.CLIENT_NONCES[test_idx],
            keyshare_seed=self.CLIENT_KEYSHARE_SEEDS[test_idx],
        )

        assert our_ke1.serialize() == self.KE1[test_idx]
        assert opaque_client._deserialize_ke1(self.KE1[test_idx]) == our_ke1

    @pytest.mark.parametrize("test_idx", range(len(KE2)))
    def test_ke2(self, test_idx, opaque_server: OPAQUEServer):
        opaque_server.context = self.CONTEXTS[test_idx]
        masking_key = opaque_server._kdf.expand(
            self.RANDOMIZED_PASSWORDS[test_idx], b"MaskingKey", opaque_server._kdf.digest_size
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
            ke1=opaque_server._deserialize_ke1(self.KE1[test_idx]),
            client_identity=self.CLIENT_IDENTITIES[test_idx],
            # Parameters specified for tests
            masking_nonce=self.MASKING_NONCES[test_idx],
            nonce=self.SERVER_NONCES[test_idx],
            keyshare_seed=self.SERVER_KEYSHARE_SEEDS[test_idx],
        )

        assert our_ke2.serialize() == self.KE2[test_idx]
