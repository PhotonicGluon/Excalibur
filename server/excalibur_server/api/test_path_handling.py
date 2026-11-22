from base64 import urlsafe_b64encode
from uuid import uuid4

import pytest
from fastapi import HTTPException

from excalibur_server.api.path_handling import parse_item_details
from excalibur_server.src.config import CONFIG

ENC = b"encrypted"
TAG = b"\x01" * 32
SHORT_TAG = b"\x01" * 31


def _b64(data: bytes) -> str:
    return urlsafe_b64encode(data).decode()


class TestParseItemDetails:
    def test_valid(self):
        item_id = uuid4()
        details = parse_item_details(f"{item_id}:{_b64(ENC)}:{_b64(TAG)}")
        assert details.id == item_id
        assert details.name_enc == b"encrypted"
        assert details.name_tag == b"\x01" * 32

    def test_url_safe_characters(self):
        # These bytes encode to `-` and `_` in the URL-safe alphabet (and `+` and `/` in the standard one)
        name_enc = b"\xfb\xff\xbe\xff\xfe"
        tag = b"\xfb\xef\xff" * 10 + b"\xfb\xff"
        assert "-" in _b64(name_enc) or "_" in _b64(name_enc)
        details = parse_item_details(f"{uuid4()}:{_b64(name_enc)}:{_b64(tag)}")
        assert details.name_enc == name_enc
        assert details.name_tag == tag

    def test_name_enc_at_cap(self):
        name_enc = b"x" * CONFIG.storage.database.max_encrypted_name_size
        details = parse_item_details(f"{uuid4()}:{_b64(name_enc)}:{_b64(TAG)}")
        assert details.name_enc == name_enc

    @pytest.mark.parametrize(
        "details",
        [
            "",
            "just-one-part",
            f"{uuid4()}:AAAA",
            f"{uuid4()}:AAAA:AAAA:AAAA",  # Too many parts
            f"not-a-uuid:AAAA:{_b64(TAG)}",
            f"{uuid4()}:!!!!:{_b64(TAG)}",  # Invalid Base64
            f"{uuid4()}::{_b64(TAG)}",  # Empty name_enc
            f"{uuid4()}:AAAA:{_b64(SHORT_TAG)}",  # Wrong tag size
            f"{uuid4()}:{_b64(b'x' * (CONFIG.storage.database.max_encrypted_name_size + 1))}:{_b64(TAG)}",  # Too big
        ],
    )
    def test_malformed(self, details: str):
        with pytest.raises(HTTPException) as exc_info:
            parse_item_details(details)
        assert exc_info.value.status_code == 400
