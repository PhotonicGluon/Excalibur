from .keygen import generate_key, normalize_password, slow_hash


def test_removes_leading_and_trailing_whitespace():
    """
    Tests that normalize_password correctly removes leading and trailing whitespace.
    """

    password = "  password  "
    result = normalize_password(password)
    expected = "password".encode("utf-8")
    assert result == expected


def test_normalizes_the_password_to_nfkd():
    """
    Tests that normalize_password correctly applies NFKD normalization.
    """

    password = "ﬃ"
    result = normalize_password(password)
    expected = "ffi".encode("utf-8")
    assert result == expected


def test_slow_hash():
    """
    Tests the slow_hash function with a known password, salt, and expected output to ensure the
    hashing algorithm is correct.
    """

    password = "password".encode("utf-8")
    salt = bytes.fromhex("deadbeef")
    result = slow_hash(password, salt)

    assert len(result) == 32
    assert result == bytes.fromhex("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9")


def test_generate_key():
    """
    Tests the end-to-end generate_key function to ensure it produces the correct key from a string
    password and salt.
    """

    password = "password"
    salt = bytes.fromhex("deadbeef")
    result = generate_key(password, salt)

    assert len(result) == 32
    assert result == bytes.fromhex("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9")
