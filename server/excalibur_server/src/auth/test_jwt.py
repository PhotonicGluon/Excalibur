from datetime import UTC, datetime

import jwt as pyjwt
import pytest

from .jwt import REQUIRED_JWT_FIELDS, _generate_key, decode_token, generate_token

SAMPLE_DATA = {"key-1": "value-1", "key-2": "value-2", "key-3": "value-3"}
SUB = "sample-subject"
KEY = b"sample 32-byte key for crypto!!!"
TOKEN = generate_token(SUB, SAMPLE_DATA, KEY)


class TestJWT:
    def test_check_token(self):
        decoded_data = decode_token(TOKEN, KEY)
        assert decoded_data == SAMPLE_DATA | {"sub": SUB}

    def test_invalid_token_format(self):
        wrong_token = list(TOKEN)
        wrong_token[0] = "A"
        wrong_token = "".join(wrong_token)

        assert decode_token(wrong_token, KEY) is None

    @pytest.mark.parametrize("required_field", REQUIRED_JWT_FIELDS)
    def test_invalid_token_missing_required_field(self, required_field: str):
        wrong_token = pyjwt.decode(TOKEN, options={"verify_signature": False})
        del wrong_token[required_field]
        wrong_token = pyjwt.encode(wrong_token, _generate_key(SUB, KEY), algorithm="HS256")

        assert decode_token(wrong_token, KEY) is None

    def test_issue_time_after_now(self):
        wrong_token = pyjwt.decode(TOKEN, options={"verify_signature": False})
        wrong_token["iat"] = datetime.now(tz=UTC).timestamp() + 1000
        wrong_token = pyjwt.encode(wrong_token, _generate_key(SUB, KEY), algorithm="HS256")

        assert decode_token(wrong_token, KEY) is None

    def test_expiry_time_before_now(self):
        wrong_token = pyjwt.decode(TOKEN, options={"verify_signature": False})
        wrong_token["exp"] = datetime.now(tz=UTC).timestamp() - 1000
        wrong_token = pyjwt.encode(wrong_token, _generate_key(SUB, KEY), algorithm="HS256")

        assert decode_token(wrong_token, KEY) is None
