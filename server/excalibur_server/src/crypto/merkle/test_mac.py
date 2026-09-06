from io import BytesIO

import pytest

from excalibur_server.src.crypto.merkle.mac import get_content_mac_input

EXEF_V3_SAMPLE = bytes.fromhex(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22"
)
EXEF_V4_SAMPLE = bytes.fromhex(
    "4578454604020c000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1069048561680c74081d0e1b8cfa3aa8f00"
)
EXEF_V4_SAMPLE_LONG = bytes.fromhex(
    "45784546040204000000050000000000000048abababababababababababababababababababababababababababababababab00000000002c433d76b017c9d956aaf926c778be89833f52870da7512896271b2edcded5759fad52a6b6fb8df6bc9740970c9c8ac2a7da2bb7b67f61653c423b2ffb07a6acac1ddf8ee08c260198a910441e948c70520c71af8d0ebf81e797e6ed835495e3bd12b8f8c45e6c05682ec82b7c1a1b3462fe86d9f54e0804abfd68ce1532a33613b6c6ed87b7e3174da06d70ac6ce0128e91bd17f367d159"
)

CONTENT_MAC_INPUT_V3 = bytes.fromhex(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c"  # Header
    + "b50d70e450d7892345f7ce463da59d22"  # Footer
)
CONTENT_MAC_INPUT_V4 = bytes.fromhex("9048561680c74081d0e1b8cfa3aa8f00")  # Tag of the single chunk
CONTENT_MAC_INPUT_V4_LONG = bytes.fromhex(
    "833f52870da7512896271b2edcded575a7da2bb7b67f61653c423b2ffb07a6ac520c71af8d0ebf81e797e6ed835495e362fe86d9f54e0804abfd68ce1532a3364da06d70ac6ce0128e91bd17f367d159"
)  # Tags of the multiple chunks


class TestContentMACInput:
    def test_v3(self):
        assert get_content_mac_input(EXEF_V3_SAMPLE) == CONTENT_MAC_INPUT_V3
        assert get_content_mac_input(BytesIO(EXEF_V3_SAMPLE)) == CONTENT_MAC_INPUT_V3

    def test_v4(self):
        assert get_content_mac_input(EXEF_V4_SAMPLE) == CONTENT_MAC_INPUT_V4
        assert get_content_mac_input(BytesIO(EXEF_V4_SAMPLE)) == CONTENT_MAC_INPUT_V4

    def test_v4_long(self):
        assert get_content_mac_input(EXEF_V4_SAMPLE_LONG) == CONTENT_MAC_INPUT_V4_LONG
        assert get_content_mac_input(BytesIO(EXEF_V4_SAMPLE_LONG)) == CONTENT_MAC_INPUT_V4_LONG

    def test_invalid_version(self):
        with pytest.raises(ValueError, match="Unsupported ExEF version"):
            get_content_mac_input(EXEF_V3_SAMPLE[:4] + b"\xff")

        with pytest.raises(ValueError, match="Unsupported ExEF version"):
            get_content_mac_input(BytesIO(EXEF_V3_SAMPLE[:4] + b"\xff"))
