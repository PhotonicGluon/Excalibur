from .exef import ExEF
from .structures import Footer, Header

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
    header = Header.from_serialized(SAMPLE_EXEF[: Header.size])

    assert header.keysize == 192
    assert header.nonce == NONCE
    assert header.ct_len == 5

    # Parse footer
    footer = Footer.from_serialized(SAMPLE_EXEF[-Footer.size :])
    assert footer.tag == bytes.fromhex("21eec34610517ba0479a0ed0dd374cba")


def test_encrypt():
    ct_test = ExEF(KEY, nonce=NONCE).encrypt(b"HELLO")
    assert ct_test == SAMPLE_EXEF


def test_encrypt_stream_1():
    iterable = iter([b"HELLO"])

    encryptor = ExEF(KEY, nonce=NONCE).encryptor
    encryptor.set_params(length=5)

    output = encryptor.get()  # Header
    for chunk in iterable:
        encryptor.update(chunk)
        output += encryptor.get()
    output += encryptor.get()  # Footer

    assert output == SAMPLE_EXEF


def test_encrypt_stream_2():
    iterable = iter([b"HE", b"L", b"LO"])

    encryptor = ExEF(KEY, nonce=NONCE).encryptor
    encryptor.set_params(length=5)

    output = encryptor.get()  # Header
    for chunk in iterable:
        encryptor.update(chunk)
        output += encryptor.get()
    output += encryptor.get()  # Footer

    assert output == SAMPLE_EXEF


def test_decrypt():
    pt_test = ExEF(KEY).decrypt(SAMPLE_EXEF)
    assert pt_test == b"HELLO"


def test_decrypt_stream_1():
    iterable = iter([SAMPLE_EXEF])

    decryptor = ExEF(KEY).decryptor
    output = b""
    for chunk in iterable:
        decryptor.update(chunk)
        output += decryptor.get()

    decryptor.verify()
    assert output == b"HELLO"


def test_decrypt_stream_2():
    iterable = iter([SAMPLE_EXEF[i : i + 2] for i in range(0, len(SAMPLE_EXEF), 2)])

    decryptor = ExEF(KEY).decryptor
    output = b""
    for chunk in iterable:
        decryptor.update(chunk)
        output += decryptor.get()

    decryptor.verify()
    assert output == b"HELLO"


# def test_invalid():
#     # Incorrect magic constant
#     with pytest.raises(ValueError):
#         ExEF.from_serialized(b"NOPE" + SAMPLE_EXEF[4:])

#     # Invalid keysize
#     with pytest.raises(ValueError):
#         ExEF.from_serialized(SAMPLE_EXEF[:6] + b"\x00\x02" + SAMPLE_EXEF[8:])
