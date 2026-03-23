# ruff: noqa: E501
import pytest

from excalibur_server.src.auth.opaque.oprf import OPRFDecaf, OPRFRistretto


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
        out_blind, out_blinded_element = OPRFRistretto.blind(input, blind=blind)
        assert out_blind == blind
        assert out_blinded_element.to_bytes() == blinded_element_bytes

        # Test `blind_evaluate()`
        out_evaluated_element = OPRFRistretto.blind_evaluate(self.SK_SCALAR, out_blinded_element)
        assert out_evaluated_element.to_bytes() == evaluated_element_bytes

        # Test `finalize()`
        our_output = OPRFRistretto.finalize(input, blind, out_evaluated_element)
        assert our_output == expected_output


class TestOPRFDecaf:
    # Test vectors from RFC9497, appendix A.2
    SK_SCALAR = int.from_bytes(
        bytes.fromhex(
            "e8b1375371fd11ebeb224f832dcc16d371b4188951c438f751425699ed29ecc80c6c13e558ccd67634fd82eac94aa8d1f0d7fee990695d1e"
        ),
        "little",
    )

    TEST_VECTORS = [
        {
            "input": "00",
            "blind": "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec65fa3833a26e9388336361686ff1f83df55046504dfecad8549ba112",
            "blinded_element": "e0ae01c4095f08e03b19baf47ffdc19cb7d98e583160522a3c7d6a0b2111cd93a126a46b7b41b730cd7fc943d4e28e590ed33ae475885f6c",
            "evaluated_element": "50ce4e60eed006e22e7027454b5a4b8319eb2bc8ced609eb19eb3ad42fb19e06ba12d382cbe7ae342a0cad6ead0ef8f91f00bb7f0cd9c0a2",
            "output": "37d3f7922d9388a15b561de5829bbf654c4089ede89c0ce0f3f85bcdba09e382ce0ab3507e021f9e79706a1798ffeac68ebd5cf62e5eb9838c7068351d97ae37",
        },
        {
            "input": "5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a",
            "blind": "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec65fa3833a26e9388336361686ff1f83df55046504dfecad8549ba112",
            "blinded_element": "86a88dc5c6331ecfcb1d9aacb50a68213803c462e377577cacc00af28e15f0ddbc2e3d716f2f39ef95f3ec1314a2c64d940a9f295d8f13bb",
            "evaluated_element": "162e9fa6e9d527c3cd734a31bf122a34dbd5bcb7bb23651f1768a7a9274cc116c03b58afa6f0dede3994a60066c76370e7328e7062fd5819",
            "output": "a2a652290055cb0f6f8637a249ee45e32ef4667db0b4c80c0a70d2a64164d01525cfdad5d870a694ec77972b9b6ec5d2596a5223e5336913f945101f0137f55e",
        },
    ]

    @pytest.mark.parametrize("test_vector", TEST_VECTORS)
    def test_oprf(self, test_vector):
        input, blind, blinded_element_hex, evaluated_element_hex, expected_output = (
            bytes.fromhex(test_vector["input"]),
            int.from_bytes(bytes.fromhex(test_vector["blind"]), "little"),
            bytes.fromhex(test_vector["blinded_element"]),
            bytes.fromhex(test_vector["evaluated_element"]),
            bytes.fromhex(test_vector["output"]),
        )

        # Test `blind()`
        out_blind, out_blinded_element = OPRFDecaf.blind(input, blind=blind)
        assert out_blind == blind
        assert out_blinded_element.to_bytes() == blinded_element_hex

        # Test `blind_evaluate()`
        out_evaluated_element = OPRFDecaf.blind_evaluate(self.SK_SCALAR, out_blinded_element)
        assert out_evaluated_element.to_bytes() == evaluated_element_hex

        # Test `finalize()`
        our_output = OPRFDecaf.finalize(input, blind, out_evaluated_element)
        assert our_output == expected_output
