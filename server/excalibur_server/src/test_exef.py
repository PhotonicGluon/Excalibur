import pytest

from .exef import ExEF, ExEFFooter, ExEFHeader

KEY = b"1" * 24
NONCE = b"\xab" * 12
SAMPLE_EXEF = (
    b"ExEF"
    + b"\x00\x02"
    + b"\x00\xc0"
    + NONCE
    + b"\x00\x00\x00\x00\x00\x00\x00\x05"
    + bytes.fromhex("2e3aa84b6a")  # HELLO, encrypted
    + bytes.fromhex("21eec34610517ba0479a0ed0dd374cba")
)


def test_parsing():
    # Parse header
    header = ExEFHeader.from_serialized(SAMPLE_EXEF[: ExEFHeader.header_size])

    assert header.keysize == 192
    assert header.nonce == NONCE
    assert header.ct_len == 5

    # Parse footer
    footer = ExEFFooter.from_serialized(SAMPLE_EXEF[-ExEFFooter.footer_size :])
    assert footer.tag == bytes.fromhex("21eec34610517ba0479a0ed0dd374cba")


def test_encrypt():
    parsed = ExEF(key=KEY, nonce=NONCE)
    assert parsed.encrypt(b"HELLO") == SAMPLE_EXEF


def test_encrypt_stream():
    parsed = ExEF(key=KEY, nonce=NONCE)
    iterable = iter([b"HE", b"L", b"LO"])

    output = b""
    for chunk in parsed.encrypt_stream(5, iterable):
        output += chunk

    assert output == SAMPLE_EXEF


def test_decrypt():
    pt_test = ExEF.decrypt(KEY, SAMPLE_EXEF)
    assert pt_test == b"HELLO"


def test_decrypt_stream():
    iterable = iter([SAMPLE_EXEF[i : i + 2] for i in range(0, len(SAMPLE_EXEF), 2)])

    output = b""
    for chunk in ExEF.decrypt_stream(KEY, iterable):
        output += chunk

    assert output == b"HELLO"


# def test_invalid():
#     # Incorrect magic constant
#     with pytest.raises(ValueError):
#         ExEF.from_serialized(b"NOPE" + SAMPLE_EXEF[4:])

#     # Invalid keysize
#     with pytest.raises(ValueError):
#         ExEF.from_serialized(SAMPLE_EXEF[:6] + b"\x00\x02" + SAMPLE_EXEF[8:])
