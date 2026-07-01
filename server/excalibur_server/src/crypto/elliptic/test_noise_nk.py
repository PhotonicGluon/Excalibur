import pytest

from excalibur_server.src.crypto.elliptic import NoiseNK, Ristretto255

PRIV_KEY = 112358
PUB_KEY = PRIV_KEY * Ristretto255.GENERATOR

CLIENT_KEYSHARE_PRIV = 1234
CLIENT_KEYSHARE_PUB = CLIENT_KEYSHARE_PRIV * Ristretto255.GENERATOR
TAG_1 = bytes.fromhex("c8c72eeba4867ede902f0f0b2d91cc41")

SERVER_KEYSHARE_PRIV = 5678
SERVER_KEYSHARE_PUB = SERVER_KEYSHARE_PRIV * Ristretto255.GENERATOR
TAG_2 = bytes.fromhex("504931aae34a4baf1e6ad64fab726047")

SESSION_KEY = bytes.fromhex("c8fe061c86f910a6b2689f336067a83f7551cc209e3fe05cdbcc6621741c3e67")


class TestNoiseNK:
    def test_message_c_to_s(self):
        noise = NoiseNK(PUB_KEY)
        client_keyshare_pub, tag = noise.message_c_to_s(client_keyshare_priv=CLIENT_KEYSHARE_PRIV)
        assert client_keyshare_pub == CLIENT_KEYSHARE_PUB
        assert tag == TAG_1

    def test_message_s_to_c(self):
        noise = NoiseNK(PUB_KEY)
        e_pub, tag, session_key = noise.message_s_to_c(
            CLIENT_KEYSHARE_PUB, TAG_1, server_priv=PRIV_KEY, server_keyshare_priv=SERVER_KEYSHARE_PRIV
        )
        assert e_pub == SERVER_KEYSHARE_PUB
        assert tag == TAG_2
        assert session_key == SESSION_KEY

    def test_message_s_to_c_rejects_bad_tag(self):
        noise = NoiseNK(PUB_KEY)
        with pytest.raises(ValueError):
            noise.message_s_to_c(
                CLIENT_KEYSHARE_PUB, b"\x00" * 16, server_priv=PRIV_KEY, server_keyshare_priv=SERVER_KEYSHARE_PRIV
            )

    def test_client_derive_session_key(self):
        noise = NoiseNK(PUB_KEY)
        noise.message_c_to_s(client_keyshare_priv=CLIENT_KEYSHARE_PRIV)
        assert noise.client_derive_session_key(CLIENT_KEYSHARE_PRIV, SERVER_KEYSHARE_PUB, TAG_2) == SESSION_KEY

    def test_client_derive_session_key_rejects_bad_tag(self):
        noise = NoiseNK(PUB_KEY)
        noise.message_c_to_s(client_keyshare_priv=CLIENT_KEYSHARE_PRIV)
        with pytest.raises(ValueError):
            noise.client_derive_session_key(CLIENT_KEYSHARE_PRIV, SERVER_KEYSHARE_PUB, b"\x00" * 16)
