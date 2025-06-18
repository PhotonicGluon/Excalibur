import pytest

from .exef import ExEF

SAMPLE_EXEF = (
    b"ExEF" + b"\x00\x02" + b"\x00\xc0" + b"\xab" * 12 + b"\x00\x00\x00\x00\x00\x00\x00\x05" + b"HELLO" + b"\xcd" * 16
)


def test_parse():
    parsed = ExEF.from_serialized(SAMPLE_EXEF)
    assert len(parsed.serialize_exef()) == len(SAMPLE_EXEF)
    assert parsed.version == 2
    assert parsed.keysize == 192
    assert parsed.alg == "aes-192-gcm"
    assert parsed.nonce == b"\xab" * 12
    assert parsed.ciphertext == b"HELLO"
    assert parsed.tag == b"\xcd" * 16

    assert parsed.serialize_exef() == SAMPLE_EXEF


def test_invalid():
    # Incorrect magic constant
    with pytest.raises(ValueError):
        ExEF.from_serialized(b"NOPE" + SAMPLE_EXEF[4:])

    # Invalid keysize
    with pytest.raises(ValueError):
        ExEF.from_serialized(SAMPLE_EXEF[:6] + b"\x00\x02" + SAMPLE_EXEF[8:])
