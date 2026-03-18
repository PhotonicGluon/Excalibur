import pytest

from excalibur_server.src.auth.opaque.operation import OPAQUEClient


class TestOPAQUERistretto255:
    # Test vectors from RFC9807, Appendix C.1.1 and C.1.2
    PASSWORDS_RAW = [
        "436f7272656374486f72736542617474657279537461706c65",
        "436f7272656374486f72736542617474657279537461706c65",
    ]
    CLIENT_NONCES_RAW = [
        "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
        "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
    ]
    CLIENT_KEYSHARE_SEEDS_RAW = [
        "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
        "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
    ]
    BLIND_LOGINS_RAW = [
        "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
        "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
    ]
    KE1_RAW = [
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
        "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
    ]

    PASSWORDS = [bytes.fromhex(password) for password in PASSWORDS_RAW]
    CLIENT_NONCES = [bytes.fromhex(nonce) for nonce in CLIENT_NONCES_RAW]
    CLIENT_KEYSHARE_SEEDS = [bytes.fromhex(seed) for seed in CLIENT_KEYSHARE_SEEDS_RAW]
    BLIND_LOGINS = [int.from_bytes(bytes.fromhex(blind), "little") for blind in BLIND_LOGINS_RAW]
    KE1 = [bytes.fromhex(ke1) for ke1 in KE1_RAW]

    @pytest.fixture
    def opaque_client(self):
        return OPAQUEClient(oprf_type="ristretto255-sha512")

    @pytest.mark.parametrize("test_idx", range(len(KE1)))
    def test_ke1(self, test_idx, opaque_client: OPAQUEClient):
        our_ke1 = opaque_client.generate_ke1(
            password=self.PASSWORDS[test_idx],
            blind=self.BLIND_LOGINS[test_idx],
            nonce=self.CLIENT_NONCES[test_idx],
            keyshare_seed=self.CLIENT_KEYSHARE_SEEDS[test_idx],
        )

        assert our_ke1.serialize() == self.KE1[test_idx]
