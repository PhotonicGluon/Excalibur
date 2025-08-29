from datetime import datetime, timezone

import pytest

from excalibur_server.src.config import CONFIG
from excalibur_server.src.security.token.auth import generate_auth_token


@pytest.fixture
def auth_key():
    return generate_auth_token(
        "test-user", b"one demo 16B key", datetime.now(tz=timezone.utc).timestamp() + CONFIG.api.login_validity_time
    )
