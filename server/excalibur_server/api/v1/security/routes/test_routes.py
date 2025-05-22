import os
from base64 import b64encode

from Crypto.Util.number import long_to_bytes
from fastapi.testclient import TestClient

from excalibur_server.api.app import app
from excalibur_server.api.v1.security.auth.srp import SRPGroup
from excalibur_server.api.v1.security.consts import SRP_GROUP

# Values from RFC5054, Appendix B
GROUP = SRPGroup.SMALL
S = int("BEB25379 D1A8581E B5A72767 3A2441EE".replace(" ", ""), 16)
N, G = GROUP.prime, GROUP.generator
K = int("7556AA04 5AEF2CDD 07ABAF0F 665C3E81 8913186F".replace(" ", ""), 16)
V = int(
    "7E273DE8 696FFC4F 4E337D05 B4B375BE B0DDE156 9E8FA00A 9886D812 9BADA1F1 822223CA 1A605B53 0E379BA4 729FDC59 F105B478 7E5186F5 C671085A 1447B52A 48CF1970 B4FB6F84 00BBF4CE BFBB1681 52E08AB5 EA53D15C 1AFF87B2 B9DA6E04 E058AD51 CC72BFC9 033B564E 26480D78 E955A5E2 9E7AB245 DB2BE315 E2099AFB".replace(
        " ", ""
    ),
    16,
)
A_PRIV = int("60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393".replace(" ", ""), 16)
B_PRIV = int("E487CB59 D31AC550 471E81F0 0F6928E0 1DDA08E9 74A004F4 9E61F5D1 05284D20".replace(" ", ""), 16)
A_PUB = int(
    "61D5E490 F6F1B795 47B0704C 436F523D D0E560F0 C64115BB 72557EC4 4352E890 3211C046 92272D8B 2D1A5358 A2CF1B6E 0BFCF99F 921530EC 8E393561 79EAE45E 42BA92AE ACED8251 71E1E8B9 AF6D9C03 E1327F44 BE087EF0 6530E69F 66615261 EEF54073 CA11CF58 58F0EDFD FE15EFEA B349EF5D 76988A36 72FAC47B 0769447B".replace(
        " ", ""
    ),
    16,
)
B_PUB = int(
    "BD0C6151 2C692C0C B6D041FA 01BB152D 4916A1E7 7AF46AE1 05393011 BAF38964 DC46A067 0DD125B9 5A981652 236F99D9 B681CBF8 7837EC99 6C6DA044 53728610 D0C6DDB5 8B318885 D7D82C7F 8DEB75CE 7BD4FBAA 37089E6F 9C6059F3 88838E7A 00030B33 1EB76840 910440B1 B27AAEAE EB4012B7 D7665238 A8E3FB00 4B117B58".replace(
        " ", ""
    ),
    16,
)
U = int("CE38B959 3487DA98 554ED47D 70A7AE5F 462EF019".replace(" ", ""), 16)
PREMASTER_SECRET = int(
    "B0DC82BA BCF30674 AE450C02 87745E79 90A3381F 63B387AA F271A10D233861E3 59B48220 F7C4693C 9AE12B0A 6F67809F 0876E2D0 13800D6C41BB59B6 D5979B5C 00A172B4 A2A5903A 0BDCAF8A 709585EB 2AFAFA8F3499B200 210DCC1F 10EB3394 3CD67FC8 8A2F39A4 BE5BEC4E C0A3212DC346D7E4 74B29EDE 8A469FFE CA686E5A".replace(
        " ", ""
    ),
    16,
)

# Verification values, self-computed
M1 = int("D67B66EE 8621C267 7BFD97E7 82480762 5693212F AE9599D9 59A03F82 0F4E815C".replace(" ", ""), 16)
M2 = int("53EEEE88 4F3309A0 6645299F F457AAD0 FB724151 B872B44F 2382F52D C0D0E820".replace(" ", ""), 16)


client = TestClient(app)
os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"
os.environ["EXCALIBUR_SERVER_TEST_VERIFIER"] = b64encode(long_to_bytes(V)).decode("UTF-8")
os.environ["EXCALIBUR_SERVER_TEST_B_PRIV"] = b64encode(long_to_bytes(B_PRIV)).decode("UTF-8")


def test_group_establishment():
    response = client.get("/api/v1/security/group-size")
    response.raise_for_status()
    response = response.json()
    assert response == SRP_GROUP.bits


def test_srp_negotiation():
    response = client.post("/api/v1/security/handshake", json=b64encode(long_to_bytes(A_PUB)).decode("UTF-8"))
    response.raise_for_status()
    response = response.json()
    assert response["server_public_value"] == b64encode(long_to_bytes(B_PUB)).decode("UTF-8")

    response = client.post(
        "/api/v1/security/generate-token",
        json={
            "salt": b64encode(long_to_bytes(S)).decode("UTF-8"),
            "client_public_value": b64encode(long_to_bytes(A_PUB)).decode("UTF-8"),
            "server_public_value": b64encode(long_to_bytes(B_PUB)).decode("UTF-8"),
            "m1": b64encode(long_to_bytes(M1)).decode("UTF-8"),
            "handshake": response["handshake"],
        },
    )
    response.raise_for_status()
    response = response.json()

    assert response["m2"] == b64encode(long_to_bytes(M2)).decode("UTF-8")
    assert response["token"]
