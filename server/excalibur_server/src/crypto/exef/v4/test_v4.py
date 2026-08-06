import pytest

from .processor import ExEFv4
from .structures import (
    DEFAULT_EXPONENT,
    HEADER_SIZE,
    MIN_EXPONENT,
    TAG_SIZE,
    Header,
    compute_encrypted_size,
)

# Keys of each supported strength
KEY_128 = b"1" * 16
KEY_192 = b"1" * 24
KEY_256 = b"1" * 32
KEYS = {128: KEY_128, 192: KEY_192, 256: KEY_256}

SALT = b"\xab" * 32

# Deterministic vectors generated with salt = 0xab * 32, exponent = 12, plaintext = b"Hello World!"
SAMPLE_EXEF_128 = bytes.fromhex(
    "4578454604010c000000010000000000000014abababababababababababababababababababababababababababababababab"
    "0000000000f37280d2e17260e417fcfa9ab22ea25127b62d6df1bc07b6e5b0cc73afc42b21924ed9d6"
)
SAMPLE_EXEF_192 = bytes.fromhex(
    "4578454604020c000000010000000000000014abababababababababababababababababababababababababababababababab"
    "00000000002c433d76b017c9955f8ed40be919a8a7c1efd1069048561680c74081d0e1b8cfa3aa8f00"
)
SAMPLE_EXEF_256 = bytes.fromhex(
    "4578454604030c000000010000000000000014abababababababababababababababababababababababababababababababab"
    "0000000000a02d6cf1fad6752d572f82c56fe91ca4e3ca3c9e1a99754bf46184c34089615120463626"
)
EXEFS = {128: SAMPLE_EXEF_128, 192: SAMPLE_EXEF_192, 256: SAMPLE_EXEF_256}


class TestHeader:
    def test_serialize_roundtrip(self):
        header = Header(cipher_id=3, exponent=12, chunk_count=1, padded_size=20, salt=SALT)
        raw = header.serialize_as_bytes()
        assert len(raw) == HEADER_SIZE
        assert raw[:4] == b"ExEF"
        assert raw[4] == 4

        parsed = Header.from_serialized(raw)
        assert parsed.cipher_id == 3
        assert parsed.exponent == 12
        assert parsed.chunk_count == 1
        assert parsed.padded_size == 20
        assert parsed.salt == SALT
        assert parsed.strength == 256

    def test_parse_sample(self):
        header = Header.from_serialized(SAMPLE_EXEF_128[:HEADER_SIZE])
        assert header.cipher_id == 1
        assert header.exponent == 12
        assert header.chunk_count == 1
        assert header.padded_size == 20
        assert header.salt == SALT

    def test_wrong_size(self):
        with pytest.raises(ValueError, match="header must be"):
            Header.from_serialized(b"\x00" * 10)

    def test_bad_magic(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[:4] = b"NOPE"
        with pytest.raises(ValueError, match="must start with 'ExEF'"):
            Header.from_serialized(bytes(raw))

    def test_wrong_version(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[4] = 3
        with pytest.raises(ValueError, match="version must be 4"):
            Header.from_serialized(bytes(raw))

    def test_unknown_cipher(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[5] = 0xFF
        with pytest.raises(ValueError, match="unknown cipher"):
            Header.from_serialized(bytes(raw))

    def test_nonzero_reserved(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[55] = 0x01
        with pytest.raises(ValueError, match="reserved bytes must be zero"):
            Header.from_serialized(bytes(raw))

    @pytest.mark.parametrize("exponent", [0, 11, 31, 255])
    def test_exponent_out_of_range(self, exponent: int):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[6] = exponent
        with pytest.raises(ValueError, match="exponent must be between"):
            Header.from_serialized(bytes(raw))

    def test_padded_size_not_padme(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[11:19] = (27).to_bytes(8, "big")  # padded_size - 8 = 19, which is not a PADME fixed point
        with pytest.raises(ValueError, match="not a valid PADME output"):
            Header.from_serialized(bytes(raw))

    def test_chunk_count_mismatch(self):
        raw = bytearray(SAMPLE_EXEF_128[:HEADER_SIZE])
        raw[7:11] = (2).to_bytes(4, "big")  # Should be 1
        with pytest.raises(ValueError, match="chunk count does not match"):
            Header.from_serialized(bytes(raw))


class TestSizeHelpers:
    @pytest.mark.parametrize("length", [0, 1, 32, 1000, 100000])
    def test_encrypted_size_matches_actual(self, length: int):
        plaintext = b"x" * length
        ct = ExEFv4(KEY_128, salt=SALT).encrypt(plaintext)
        assert len(ct) == ExEFv4.compute_encrypted_size(length)
        assert ExEFv4.compute_encrypted_size(length) - length == len(ct) - length

    def test_default_exponent_constant(self):
        assert MIN_EXPONENT <= DEFAULT_EXPONENT
        assert TAG_SIZE == 16


class TestValidExEFv4:
    @pytest.mark.parametrize("strength", KEYS.keys())
    def test_encrypt_vector(self, strength: int):
        exef = ExEFv4(KEYS[strength], salt=SALT, strength=strength, exponent=12)
        ct = exef.encrypt(b"Hello World!")
        assert ct == EXEFS[strength]

    @pytest.mark.parametrize("strength", KEYS.keys())
    def test_decrypt_vector(self, strength: int):
        exef = ExEFv4(KEYS[strength])
        pt = exef.decrypt(EXEFS[strength])
        assert pt == b"Hello World!"

    @pytest.mark.parametrize("strength", KEYS.keys())
    def test_validation(self, strength: int):
        assert ExEFv4.validate(EXEFS[strength])

    def test_fresh_salt_each_instance(self):
        a = ExEFv4(KEY_128).encrypt(b"data")
        b = ExEFv4(KEY_128).encrypt(b"data")
        assert a != b  # Different random salts means different ciphertext

    @pytest.mark.parametrize("length", [0, 1, 12, 4095, 4096, 4097, 8192, 20000])
    def test_roundtrip_various_lengths(self, length: int):
        plaintext = bytes((i % 256) for i in range(length))
        ct = ExEFv4(KEY_128, salt=SALT, exponent=12).encrypt(plaintext)
        assert len(ct) == compute_encrypted_size(length, 12)
        assert ExEFv4(KEY_128).decrypt(ct) == plaintext

    def test_multichunk_boundaries(self):
        # An exponent of 12 means 4096-byte chunks; exercise several chunk counts
        for length in [4088, 4089, 8184, 8185, 12281]:
            plaintext = bytes((i % 256) for i in range(length))
            ct = ExEFv4(KEY_256, salt=SALT, exponent=12).encrypt(plaintext)
            header = Header.from_serialized(ct[:HEADER_SIZE])
            assert header.chunk_count == (header.padded_size + 4095) // 4096
            assert ExEFv4(KEY_256).decrypt(ct) == plaintext

    def test_streaming_encrypt(self):
        exef = ExEFv4(KEY_192, salt=SALT, exponent=12)
        encryptor = exef.encryptor
        encryptor.set_params(length=12)
        output = encryptor.get()  # Header
        for chunk in [b"He", b"llo Wo", b"rld!"]:
            encryptor.update(chunk)
            output += encryptor.get()
        assert encryptor.fully_processed
        output += encryptor.get()  # No footer in v4; yields b""
        assert output == SAMPLE_EXEF_192

    def test_streaming_decrypt_byte_by_byte(self):
        ct = ExEFv4(KEY_256, salt=SALT, exponent=12).encrypt(b"streamed" * 2000)
        decryptor = ExEFv4(KEY_256).decryptor
        output = b""
        for i in range(0, len(ct), 5):
            decryptor.update(ct[i : i + 5])
            output += decryptor.get()
        output += decryptor.get()
        decryptor.verify()
        assert output == b"streamed" * 2000
        assert decryptor.fully_processed


class TestInvalidExEFv4:
    def test_invalid_keysize(self):
        with pytest.raises(ValueError, match="keysize must be 128, 192, or 256"):
            ExEFv4(key=b"123")

    def test_invalid_salt(self):
        with pytest.raises(ValueError, match="salt must be 32 bytes"):
            ExEFv4(KEY_128, salt=b"too short")

    def test_wrong_key_rejected(self):
        ct = ExEFv4(KEY_128, salt=SALT).encrypt(b"secret")
        wrong = bytearray(KEY_128)
        wrong[0] ^= 0xFF
        with pytest.raises(ValueError):
            ExEFv4(bytes(wrong)).decrypt(ct)

    def test_tampered_ciphertext(self):
        ct = bytearray(ExEFv4(KEY_128, salt=SALT).encrypt(b"secret data"))
        ct[-1] ^= 0x01  # Flip a tag bit
        with pytest.raises(ValueError):
            ExEFv4(KEY_128).decrypt(bytes(ct))

    def test_tampered_header_breaks_aad(self):
        ct = bytearray(ExEFv4(KEY_128, salt=SALT, exponent=12).encrypt(b"secret data"))
        ct[6] = 13  # Change the exponent; AAD (and chunk-count check) no longer match
        with pytest.raises(ValueError):
            ExEFv4(KEY_128).decrypt(bytes(ct))

    def test_truncated_final_tag(self):
        ct = ExEFv4(KEY_128, salt=SALT).encrypt(b"secret data")
        decryptor = ExEFv4(KEY_128).decryptor
        decryptor.update(ct[:-1])  # Drop the last tag byte
        assert not decryptor.fully_processed
        with pytest.raises(ValueError, match="incomplete"):
            decryptor.verify()

    def test_trailing_data(self):
        ct = ExEFv4(KEY_128, salt=SALT).encrypt(b"secret data") + b"junk"
        decryptor = ExEFv4(KEY_128).decryptor
        decryptor.update(ct)
        with pytest.raises(ValueError, match="trailing data"):
            decryptor.verify()
