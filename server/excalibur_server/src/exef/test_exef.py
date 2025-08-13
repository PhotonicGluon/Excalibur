import pytest

from .exef import ExEF
from .structures import Footer, Header

KEY = b"1" * 24
NONCE = b"\xab" * 12

HEADER = b"ExEF" + b"\x00\x02" + b"\x00\xc0" + NONCE + b"\x00\x00\x00\x00\x00\x00\x00\x05"
FOOTER = bytes.fromhex("21eec34610517ba0479a0ed0dd374cba")
SAMPLE_EXEF = HEADER + bytes.fromhex("2e3aa84b6a") + FOOTER  # HELLO, encrypted


# Helper functions
def _generate_invalid_magic():
    invalid = b"NOPE" + SAMPLE_EXEF[4:]
    return invalid


def _generate_invalid_version():
    invalid = SAMPLE_EXEF[:4] + b"\xff\xff" + SAMPLE_EXEF[6:]
    return invalid


def _generate_invalid_footer():
    invalid = SAMPLE_EXEF[:-1]  # One byte short
    return invalid


def _generate_invalid_tag():
    invalid = SAMPLE_EXEF[:-1] + ((SAMPLE_EXEF[-1] + 0x01) % 0xFF).to_bytes(1, "big")
    return invalid


# Tests
class TestValidExEF:
    def test_parsing(self):
        # Parse header
        header = Header.from_serialized(SAMPLE_EXEF[: Header.size])

        assert header.keysize == 192
        assert header.nonce == NONCE
        assert header.ct_len == 5
        assert header.serialize_as_bytes() == HEADER

        # Parse footer
        footer = Footer.from_serialized(SAMPLE_EXEF[-Footer.size :])
        assert footer.tag == FOOTER
        assert footer.serialize_as_bytes() == FOOTER

    def test_encrypt(self):
        ct_test = ExEF(KEY, nonce=NONCE).encrypt(b"HELLO")
        assert ct_test == SAMPLE_EXEF

    def test_encrypt_stream_1(self):
        iterable = iter([b"HELLO"])

        encryptor = ExEF(KEY, nonce=NONCE).encryptor
        encryptor.set_params(length=5)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == SAMPLE_EXEF

    def test_encrypt_stream_2(self):
        iterable = iter([b"HE", b"L", b"LO"])

        encryptor = ExEF(KEY, nonce=NONCE).encryptor
        encryptor.set_params(length=5)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == SAMPLE_EXEF

    def test_decrypt(self):
        pt_test = ExEF(KEY).decrypt(SAMPLE_EXEF)
        assert pt_test == b"HELLO"

    def test_decrypt_stream_1(self):
        iterable = iter([SAMPLE_EXEF])

        decryptor = ExEF(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"HELLO"

    def test_decrypt_stream_2(self):
        iterable = iter([SAMPLE_EXEF[i : i + 2] for i in range(0, len(SAMPLE_EXEF), 2)])

        decryptor = ExEF(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"HELLO"


class TestInvalidExEF:
    @pytest.fixture
    def exef(self):
        return ExEF(KEY, nonce=NONCE)

    def test_invalid_key(self):
        with pytest.raises(ValueError, match="keysize must be 128, 192, or 256"):
            ExEF(key=b"123", nonce=b"123456789012")

    def test_invalid_nonce(self):
        with pytest.raises(ValueError, match="nonce must be 12 bytes"):
            ExEF(key=KEY, nonce=b"123")

    def test_magic(self, exef: ExEF):
        with pytest.raises(ValueError, match="data must start with ExEF"):
            exef.decrypt(_generate_invalid_magic())

    def test_version(self, exef: ExEF):
        with pytest.raises(ValueError, match="version must be"):
            exef.decrypt(_generate_invalid_version())

    def test_footer(self, exef: ExEF):
        with pytest.raises(ValueError, match="header and footer must be set"):
            exef.decrypt(_generate_invalid_footer())

    def test_tag(self, exef: ExEF):
        with pytest.raises(ValueError, match="MAC check failed"):
            exef.decrypt(_generate_invalid_tag())
