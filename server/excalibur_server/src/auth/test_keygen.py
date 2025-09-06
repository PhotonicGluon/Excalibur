from .keygen import fast_hash, generate_key, normalize_password, slow_hash


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


def test_fast_hash():
    """
    Tests the fast_hash function with a known password, salt, and expected output to ensure the
    hashing algorithm is correct.
    """

    additional_info = {"username": "test-user"}
    salt = bytes.fromhex("deadbeef")
    result = fast_hash(additional_info, salt)

    assert len(result) == 32
    assert result == bytes.fromhex("2a729be3d3e50315c32e87d48c7be45db7059088d7ab1549ffb53cf500778ac6")


def test_generate_key():
    """
    Tests the end-to-end generate_key function to ensure it produces the correct key from a string
    password and salt.
    """

    password = "password"
    additional_info = {"username": "test-user"}
    salt = bytes.fromhex("deadbeef")
    result = generate_key(password, additional_info, salt)

    assert len(result) == 32
    assert result == bytes.fromhex("b71e1bd0283edcb73d117b97afb9ddea19a08fd179e3877c9f3d5cb19849103f")
