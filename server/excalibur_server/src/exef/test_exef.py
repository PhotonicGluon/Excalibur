import pytest

from .exef import ExEF
from .structures import Footer, Header

KEY = b"1" * 24
NONCE = b"\xab" * 12
HEADER_MAC = bytes.fromhex("3a5a8758e2c946869e38d6ae9d7f")

HEADER = (
    b"ExEF"  # Magic
    + b"\x03"  # Version
    + b"\x02"  # Cipher ID, corresponding to AES-192-GCM
    + NONCE
    + HEADER_MAC  # Header MAC
    + b"\x00\x00\x00\x00\x00\x00\x00\x0c"  # Ciphertext length
)
FOOTER = bytes.fromhex("b50d70e450d7892345f7ce463da59d22")
SAMPLE_EXEF = HEADER + bytes.fromhex("01a2d354eb2527742fa264b5") + FOOTER  # HELLO, encrypted


# Helper functions
def _generate_invalid_magic():
    invalid = b"NOPE" + SAMPLE_EXEF[4:]
    return invalid


def _generate_invalid_version():
    invalid = SAMPLE_EXEF[:4] + b"\xff" + SAMPLE_EXEF[5:]
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

        assert header.cipher_id == 2
        assert header.nonce == NONCE
        assert header.header_mac == HEADER_MAC, f"Different header MAC: {header.header_mac.hex()} != {HEADER_MAC.hex()}"
        assert header.ct_len == 12
        assert header.serialize_as_bytes() == HEADER

        # Parse footer
        footer = Footer.from_serialized(SAMPLE_EXEF[-Footer.size :])
        assert footer.tag == FOOTER
        assert footer.serialize_as_bytes() == FOOTER

    def test_validation(self):
        assert ExEF.validate(SAMPLE_EXEF)

    def test_encrypt(self):
        ct_test = ExEF(KEY, nonce=NONCE).encrypt(b"Hello World!")
        assert ct_test == SAMPLE_EXEF

    def test_encrypt_stream_1(self):
        iterable = iter([b"Hello World!"])

        encryptor = ExEF(KEY, nonce=NONCE).encryptor
        encryptor.set_params(length=12)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == SAMPLE_EXEF

    def test_encrypt_stream_2(self):
        iterable = iter([b"He", b"llo Wo", b"rld!"])

        encryptor = ExEF(KEY, nonce=NONCE).encryptor
        encryptor.set_params(length=12)

        output = encryptor.get()  # Header
        for chunk in iterable:
            encryptor.update(chunk)
            output += encryptor.get()
        output += encryptor.get()  # Footer

        assert output == SAMPLE_EXEF

    def test_decrypt(self):
        pt_test = ExEF(KEY).decrypt(SAMPLE_EXEF)
        assert pt_test == b"Hello World!"

    def test_decrypt_stream_1(self):
        iterable = iter([SAMPLE_EXEF])

        decryptor = ExEF(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"Hello World!"

    def test_decrypt_stream_2(self):
        iterable = iter([SAMPLE_EXEF[i : i + 2] for i in range(0, len(SAMPLE_EXEF), 2)])

        decryptor = ExEF(KEY).decryptor
        output = b""
        for chunk in iterable:
            decryptor.update(chunk)
            output += decryptor.get()

        decryptor.verify()
        assert output == b"Hello World!"


class TestInvalidExEF:
    @pytest.fixture
    def exef(self):
        return ExEF(KEY, nonce=NONCE)

    def test_invalid_keysize(self):
        with pytest.raises(ValueError, match="keysize must be 128, 192, or 256"):
            ExEF(key=b"123", nonce=b"123456789012")

    def test_invalid_nonce(self):
        with pytest.raises(ValueError, match="nonce must be 12 bytes"):
            ExEF(key=KEY, nonce=b"123")

    def test_invalid_key(self):
        fake_key = bytearray(KEY)
        fake_key[0] = 255 - fake_key[0]
        with pytest.raises(ValueError, match="header MAC mismatch"):
            ExEF(key=fake_key, nonce=NONCE).decrypt(SAMPLE_EXEF)

    def test_invalid_magic(self, exef: ExEF):
        invalid_magic = _generate_invalid_magic()
        assert not ExEF.validate(invalid_magic)
        with pytest.raises(ValueError, match="data must start with 'ExEF'"):
            exef.decrypt(invalid_magic)

    def test_invalid_version(self, exef: ExEF):
        invalid_version = _generate_invalid_version()
        assert not ExEF.validate(invalid_version)
        with pytest.raises(ValueError, match="version must be"):
            exef.decrypt(invalid_version)

    def test_invalid_footer(self, exef: ExEF):
        invalid_footer = _generate_invalid_footer()
        assert ExEF.validate(invalid_footer)  # Technically, this is valid ExEF data
        with pytest.raises(ValueError, match="header and footer must be set"):
            exef.decrypt(invalid_footer)

    def test_invalid_tag(self, exef: ExEF):
        invalid_tag = _generate_invalid_tag()
        assert ExEF.validate(invalid_tag)  # Technically, this is valid ExEF data
        with pytest.raises(ValueError, match="MAC check failed"):
            exef.decrypt(invalid_tag)
