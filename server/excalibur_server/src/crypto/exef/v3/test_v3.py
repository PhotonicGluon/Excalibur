import pytest

from excalibur_server.src.crypto.exef.base import KeyStrength

from .processor import ExEFv3
from .structures import Footer, Header

KEY = b"1" * 24
NONCE = b"\xab" * 12

SAMPLE_EXEF_128 = bytes.fromhex(
    "457845460301abababababababababababab3ae89cecf3e7cb56042e43d824ec000000000000000cb52c1501910110d2afcb7b114b29d231367c43770ada41198c9a96a4",
)
SAMPLE_EXEF_192 = bytes.fromhex(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22",
)
SAMPLE_EXEF_256 = bytes.fromhex(
    "457845460303abababababababababababab86250f2fdf59840a66218d549ee7000000000000000c8dcad08960b097c68ae73d0c86a807d763605e0ebf6c40df88826657",
)
EXEFS = {
    128: SAMPLE_EXEF_128,
    192: SAMPLE_EXEF_192,
    256: SAMPLE_EXEF_256,
}


# Helper functions
def _generate_invalid_magic():
    invalid = b"NOPE" + SAMPLE_EXEF_192[4:]
    return invalid


def _generate_invalid_version():
    invalid = SAMPLE_EXEF_192[:4] + b"\xff" + SAMPLE_EXEF_192[5:]
    return invalid


def _generate_invalid_footer():
    invalid = SAMPLE_EXEF_192[:-1]  # One byte short
    return invalid


def _generate_invalid_tag():
    invalid = SAMPLE_EXEF_192[:-1] + ((SAMPLE_EXEF_192[-1] + 0x01) % 0xFF).to_bytes(1, "big")
    return invalid


# Tests
class TestValidExEFv3:
    def test_parsing(self):
        # Parse header
        header = Header.from_serialized(SAMPLE_EXEF_192[: Header.size])

        assert header.cipher_id == 2
        assert header.nonce == NONCE
        assert header.header_mac.hex() == "3a5a8758e2c946869e38d6ae9d7f"
        assert header.ct_len == 12

        # Parse footer
        footer = Footer.from_serialized(SAMPLE_EXEF_192[-Footer.size :])
        assert footer.tag.hex() == "b50d70e450d7892345f7ce463da59d22"

    def test_validation(self):
        assert ExEFv3.validate(SAMPLE_EXEF_128)
        assert ExEFv3.validate(SAMPLE_EXEF_192)
        assert ExEFv3.validate(SAMPLE_EXEF_256)

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_encrypt(self, strength: KeyStrength):
        ct_test = ExEFv3(KEY, nonce=NONCE, strength=strength).encrypt(b"Hello World!")
        assert ct_test == EXEFS[strength]

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_encrypt_stream_1(self, strength: KeyStrength):
        iterable = iter([b"Hello World!"])

        encryptor = ExEFv3(KEY, nonce=NONCE, strength=strength).encryptor
        encryptor.set_params(length=12)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == EXEFS[strength]

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_encrypt_stream_2(self, strength: KeyStrength):
        iterable = iter([b"He", b"llo Wo", b"rld!"])

        encryptor = ExEFv3(KEY, nonce=NONCE, strength=strength).encryptor
        encryptor.set_params(length=12)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == EXEFS[strength]

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_decrypt(self, strength: KeyStrength):
        pt_test = ExEFv3(KEY).decrypt(EXEFS[strength])
        assert pt_test == b"Hello World!"

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_decrypt_stream_1(self, strength: KeyStrength):
        iterable = iter([EXEFS[strength]])

        decryptor = ExEFv3(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"Hello World!"

    @pytest.mark.parametrize("strength", EXEFS.keys())
    def test_decrypt_stream_2(self, strength: KeyStrength):
        iterable = iter([EXEFS[strength][i : i + 2] for i in range(0, len(EXEFS[strength]), 2)])

        decryptor = ExEFv3(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"Hello World!"


class TestInvalidExEFv3:
    @pytest.fixture
    def exef(self):
        return ExEFv3(KEY, nonce=NONCE)

    def test_invalid_keysize(self):
        with pytest.raises(ValueError, match="keysize must be 128, 192, or 256"):
            ExEFv3(key=b"123", nonce=b"123456789012")

    def test_invalid_nonce(self):
        with pytest.raises(ValueError, match="nonce must be 12 bytes"):
            ExEFv3(key=KEY, nonce=b"123")

    def test_invalid_key(self):
        fake_key = bytearray(KEY)
        fake_key[0] = 255 - fake_key[0]
        with pytest.raises(ValueError, match="header MAC mismatch"):
            ExEFv3(key=fake_key, nonce=NONCE).decrypt(SAMPLE_EXEF_192)

    def test_invalid_magic(self, exef: ExEFv3):
        invalid_magic = _generate_invalid_magic()
        assert not ExEFv3.validate(invalid_magic)
        with pytest.raises(ValueError, match="data must start with 'ExEF'"):
            exef.decrypt(invalid_magic)

    def test_invalid_version(self, exef: ExEFv3):
        invalid_version = _generate_invalid_version()
        assert not ExEFv3.validate(invalid_version)
        with pytest.raises(ValueError, match="version must be"):
            exef.decrypt(invalid_version)

    def test_invalid_footer(self, exef: ExEFv3):
        invalid_footer = _generate_invalid_footer()
        assert ExEFv3.validate(invalid_footer)  # Technically, this is valid ExEF data
        with pytest.raises(ValueError, match="header and footer must be set"):
            exef.decrypt(invalid_footer)

    def test_invalid_tag(self, exef: ExEFv3):
        invalid_tag = _generate_invalid_tag()
        assert ExEFv3.validate(invalid_tag)  # Technically, this is valid ExEF data
        with pytest.raises(ValueError, match="MAC check failed"):
            exef.decrypt(invalid_tag)
