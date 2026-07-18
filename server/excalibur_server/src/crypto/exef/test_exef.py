import pytest

from .exef import DEFAULT_VERSION, ExEF, identify_version
from .v3.test_v3 import KEY as V3_KEY
from .v3.test_v3 import NONCE
from .v3.test_v3 import SAMPLE_EXEF_192 as V3_SAMPLE
from .v4.test_v4 import KEY_256 as V4_KEY
from .v4.test_v4 import SAMPLE_EXEF_256 as V4_SAMPLE

KEY = b"1" * 24


class TestVersionIdentification:
    def test_identify_v3(self):
        assert identify_version(V3_SAMPLE) == 3

    def test_identify_v4(self):
        assert identify_version(V4_SAMPLE) == 4

    def test_identify_from_header_only(self):
        # Only the first 5 bytes are needed to identify the version
        assert identify_version(V4_SAMPLE[:5]) == 4
        assert identify_version(V3_SAMPLE[:5]) == 3

    def test_too_short(self):
        with pytest.raises(ValueError, match="too short"):
            identify_version(b"ExE")

    def test_bad_magic(self):
        with pytest.raises(ValueError, match="must start with 'ExEF'"):
            identify_version(b"NOPE\x04")

    def test_unsupported_version(self):
        with pytest.raises(ValueError, match="unsupported ExEF version"):
            identify_version(b"ExEF\x05")

    def test_unsupported_version_zero(self):
        with pytest.raises(ValueError, match="unsupported ExEF version"):
            identify_version(b"ExEF\x00")


class TestEncryptionDispatch:
    def test_default_is_v4(self):
        assert DEFAULT_VERSION == 4
        ct = ExEF(KEY).encrypt(b"Hello World!")
        assert identify_version(ct) == 4

    def test_explicit_v4(self):
        ct = ExEF(KEY, version=4).encrypt(b"Hello World!")
        assert identify_version(ct) == 4

    def test_explicit_v3(self):
        ct = ExEF(KEY, nonce=NONCE, version=3).encrypt(b"Hello World!")
        assert ct == V3_SAMPLE
        assert identify_version(ct) == 3

    def test_unsupported_version_rejected(self):
        with pytest.raises(ValueError, match="unsupported ExEF version"):
            ExEF(KEY, version=2)


class TestDecryptionAutoDetect:
    def test_decrypt_v3(self):
        assert ExEF(V3_KEY).decrypt(V3_SAMPLE) == b"Hello World!"

    def test_decrypt_v4(self):
        assert ExEF(V4_KEY).decrypt(V4_SAMPLE) == b"Hello World!"

    def test_roundtrip_v4_default(self):
        payload = b"round trip payload " * 100
        ct = ExEF(KEY).encrypt(payload)
        assert ExEF(KEY).decrypt(ct) == payload

    def test_roundtrip_v3_optin(self):
        ct = ExEF(KEY, version=3).encrypt(b"payload")
        assert ExEF(KEY).decrypt(ct) == b"payload"

    def test_same_object_decrypts_both_versions(self):
        # A single facade instance can decrypt either version
        assert ExEF(V3_KEY).decrypt(V3_SAMPLE) == b"Hello World!"
        assert ExEF(V4_KEY).decrypt(V4_SAMPLE) == b"Hello World!"


class TestStreamingAutoDetect:
    @pytest.mark.parametrize("sample,key", [(V3_SAMPLE, V3_KEY), (V4_SAMPLE, V4_KEY)])
    def test_streaming_decrypt(self, sample: bytes, key: bytes):
        decryptor = ExEF(key).decryptor
        output = b""
        for i in range(0, len(sample), 3):
            decryptor.update(sample[i : i + 3])
            output += decryptor.get()
        output += decryptor.get()
        decryptor.verify()
        assert output == b"Hello World!"
        assert decryptor.fully_processed

    def test_streaming_before_identification(self):
        # Fewer than 5 bytes: version not yet known, nothing decrypted, not complete
        decryptor = ExEF(V4_KEY).decryptor
        decryptor.update(V4_SAMPLE[:3])
        assert decryptor.get() == b""
        assert not decryptor.fully_processed
        # Feed the rest and it should complete
        decryptor.update(V4_SAMPLE[3:])
        out = decryptor.get()
        decryptor.verify()
        assert out == b"Hello World!"


class TestValidation:
    def test_validate_v3(self):
        assert ExEF.validate(V3_SAMPLE)

    def test_validate_v4(self):
        assert ExEF.validate(V4_SAMPLE)

    def test_invalid_magic(self):
        assert not ExEF.validate(b"NOPE" + V4_SAMPLE[4:])

    def test_invalid_version(self):
        assert not ExEF.validate(V4_SAMPLE[:4] + b"\x07" + V4_SAMPLE[5:])

    def test_too_short(self):
        assert not ExEF.validate(b"ExEF")


class TestSizeHelpers:
    def test_v4_encrypted_size(self):
        assert len(ExEF(KEY).encrypt(b"x" * 100)) == ExEF.encrypted_size(100)

    def test_v3_encrypted_size(self):
        assert ExEF.encrypted_size(100, version=3) == 100 + ExEF.v3_additional_size

    def test_overhead(self):
        assert ExEF.overhead(0, version=3) == ExEF.v3_additional_size
