from excalibur_server.src.crypto.merkle.mac import get_content_mac_input
import pytest


EXEF_V3_SAMPLE = bytes.fromhex(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22"
)
EXEF_V4_SAMPLE = bytes.fromhex(
    "4578454604020c000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1069048561680c74081d0e1b8cfa3aa8f00"
)

CONTENT_MAC_INPUT_V3 = bytes.fromhex(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c"  # Header
    + "b50d70e450d7892345f7ce463da59d22"  # Footer
)
CONTENT_MAC_INPUT_V4 = bytes.fromhex("9048561680c74081d0e1b8cfa3aa8f00")  # Tag of the single chunk


class TestContentMACInput:
    def test_v3(self):
        assert get_content_mac_input(EXEF_V3_SAMPLE) == CONTENT_MAC_INPUT_V3

    def test_v4(self):
        assert get_content_mac_input(EXEF_V4_SAMPLE) == CONTENT_MAC_INPUT_V4

    def test_invalid_version(self):
        with pytest.raises(ValueError, match="Unsupported ExEF version"):
            get_content_mac_input(EXEF_V3_SAMPLE[:4] + b"\xff")
