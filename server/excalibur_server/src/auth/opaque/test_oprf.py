# ruff: noqa: E501
import pytest

from excalibur_server.src.auth.opaque.oprf import OPRFRistrettoSHA512


class TestOPRFRistretto:
    # Test vectors from RFC9497, appendix A.1
    SK_SCALAR = int.from_bytes(
        bytes.fromhex("5ebcea5ee37023ccb9fc2d2019f9d7737be85591ae8652ffa9ef0f4d37063b0e"),
        "little",
    )

    TEST_VECTORS = [
        {
            "input": "00",
            "blind": "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec4c1f6706",
            "blinded_element": "609a0ae68c15a3cf6903766461307e5c8bb2f95e7e6550e1ffa2dc99e412803c",
            "evaluated_element": "7ec6578ae5120958eb2db1745758ff379e77cb64fe77b0b2d8cc917ea0869c7e",
            "output": "527759c3d9366f277d8c6020418d96bb393ba2afb20ff90df23fb7708264e2f3ab9135e3bd69955851de4b1f9fe8a0973396719b7912ba9ee8aa7d0b5e24bcf6",
        },
        {
            "input": "5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a",
            "blind": "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec4c1f6706",
            "blinded_element": "da27ef466870f5f15296299850aa088629945a17d1f5b7f5ff043f76b3c06418",
            "evaluated_element": "b4cbf5a4f1eeda5a63ce7b77c7d23f461db3fcab0dd28e4e17cecb5c90d02c25",
            "output": "f4a74c9c592497375e796aa837e907b1a045d34306a749db9f34221f7e750cb4f2a6413a6bf6fa5e19ba6348eb673934a722a7ede2e7621306d18951e7cf2c73",
        },
    ]

    @pytest.mark.parametrize("test_vector", TEST_VECTORS)
    def test_oprf(self, test_vector):
        input, blind, blinded_element_bytes, evaluated_element_bytes, expected_output = (
            bytes.fromhex(test_vector["input"]),
            int.from_bytes(bytes.fromhex(test_vector["blind"]), "little"),
            bytes.fromhex(test_vector["blinded_element"]),
            bytes.fromhex(test_vector["evaluated_element"]),
            bytes.fromhex(test_vector["output"]),
        )

        # Test `blind()`
        out_blind, out_blinded_element = OPRFRistrettoSHA512.blind(input, blind=blind)
        assert out_blind == blind
        assert out_blinded_element.to_bytes() == blinded_element_bytes

        # Test `blind_evaluate()`
        out_evaluated_element = OPRFRistrettoSHA512.blind_evaluate(self.SK_SCALAR, out_blinded_element)
        assert out_evaluated_element.to_bytes() == evaluated_element_bytes

        # Test `finalize()`
        our_output = OPRFRistrettoSHA512.finalize(input, blind, out_evaluated_element)
        assert our_output == expected_output
