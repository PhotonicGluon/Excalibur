import pytest

from .token import KEY, decode_token, generate_token

if KEY != b"one demo 16B key":
    pytest.skip("Skipping token tests as key is wrong", allow_module_level=True)

SAMPLE_DATA = {"sub": "1234567890", "name": "John Doe"}


def test_check_token():
    token = generate_token(SAMPLE_DATA)
    decoded_data = decode_token(token)
    assert decoded_data == SAMPLE_DATA

    wrong_token = list(token)
    wrong_token[123] = "A"
    wrong_token = "".join(wrong_token)
    assert decode_token(wrong_token) is None
