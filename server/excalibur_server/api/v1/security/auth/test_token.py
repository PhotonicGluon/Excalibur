import pytest

from .token import KEY, decode_token, generate_token

if KEY != "test_key":
    pytest.skip("Skipping token tests as key is wrong", allow_module_level=True)

SAMPLE_DATA = {"sub": "1234567890", "name": "John Doe", "iat": 1516239022}
SAMPLE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.C9qqnzNwRClyxecr2V4gMlTySXIgnGSwf_GlqzsHL9Y"


def test_generate_token():
    data = {"sub": "1234567890", "name": "John Doe", "iat": 1516239022}
    assert generate_token(data) == SAMPLE_TOKEN


def test_check_token():
    assert decode_token(SAMPLE_TOKEN)

    wrong_token = list(SAMPLE_TOKEN)
    wrong_token[123] = "A"
    wrong_token = "".join(wrong_token)
    assert not decode_token(wrong_token)
