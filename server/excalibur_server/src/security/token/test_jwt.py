from .jwt import decode_token, generate_token

KEY = b"one demo 16B key"
SAMPLE_DATA = {"sub": "1234567890", "name": "John Doe"}


def test_check_token():
    token = generate_token("1234567890", SAMPLE_DATA, KEY)
    decoded_data = decode_token(token, KEY)
    assert decoded_data == SAMPLE_DATA


def test_invalid_token():
    wrong_token = list(generate_token("1234567890", SAMPLE_DATA, KEY))
    wrong_token[0] = "A"
    wrong_token = "".join(wrong_token)
    assert decode_token(wrong_token, KEY) is None
