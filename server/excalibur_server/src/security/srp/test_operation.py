from Crypto.Util.number import bytes_to_long, long_to_bytes

from .group import SRPGroup
from .operation import SRP

# Values from RFC5054, Appendix B
SRP_HANDLER = SRP(SRPGroup.SMALL)

S = int("BEB25379 D1A8581E B5A72767 3A2441EE".replace(" ", ""), 16)
N, G = SRP_HANDLER.prime, SRP_HANDLER.generator
K = int("7556AA04 5AEF2CDD 07ABAF0F 665C3E81 8913186F".replace(" ", ""), 16)
V = int(
    "7E273DE8 696FFC4F 4E337D05 B4B375BE B0DDE156 9E8FA00A 9886D812 9BADA1F1 822223CA 1A605B53 0E379BA4 729FDC59 F105B478 7E5186F5 C671085A 1447B52A 48CF1970 B4FB6F84 00BBF4CE BFBB1681 52E08AB5 EA53D15C 1AFF87B2 B9DA6E04 E058AD51 CC72BFC9 033B564E 26480D78 E955A5E2 9E7AB245 DB2BE315 E2099AFB".replace(  # noqa: E501
        " ", ""
    ),
    16,
)
A_PRIV = int("60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393".replace(" ", ""), 16)
B_PRIV = int("E487CB59 D31AC550 471E81F0 0F6928E0 1DDA08E9 74A004F4 9E61F5D1 05284D20".replace(" ", ""), 16)
A_PUB = int(
    "61D5E490 F6F1B795 47B0704C 436F523D D0E560F0 C64115BB 72557EC4 4352E890 3211C046 92272D8B 2D1A5358 A2CF1B6E 0BFCF99F 921530EC 8E393561 79EAE45E 42BA92AE ACED8251 71E1E8B9 AF6D9C03 E1327F44 BE087EF0 6530E69F 66615261 EEF54073 CA11CF58 58F0EDFD FE15EFEA B349EF5D 76988A36 72FAC47B 0769447B".replace(  # noqa: E501
        " ", ""
    ),
    16,
)
B_PUB = int(
    "BD0C6151 2C692C0C B6D041FA 01BB152D 4916A1E7 7AF46AE1 05393011 BAF38964 DC46A067 0DD125B9 5A981652 236F99D9 B681CBF8 7837EC99 6C6DA044 53728610 D0C6DDB5 8B318885 D7D82C7F 8DEB75CE 7BD4FBAA 37089E6F 9C6059F3 88838E7A 00030B33 1EB76840 910440B1 B27AAEAE EB4012B7 D7665238 A8E3FB00 4B117B58".replace(  # noqa: E501
        " ", ""
    ),
    16,
)
U = int("CE38B959 3487DA98 554ED47D 70A7AE5F 462EF019".replace(" ", ""), 16)
PREMASTER_SECRET = int(
    "B0DC82BA BCF30674 AE450C02 87745E79 90A3381F 63B387AA F271A10D233861E3 59B48220 F7C4693C 9AE12B0A 6F67809F 0876E2D0 13800D6C41BB59B6 D5979B5C 00A172B4 A2A5903A 0BDCAF8A 709585EB 2AFAFA8F3499B200 210DCC1F 10EB3394 3CD67FC8 8A2F39A4 BE5BEC4E C0A3212DC346D7E4 74B29EDE 8A469FFE CA686E5A".replace(  # noqa: E501
        " ", ""
    ),
    16,
)

# Verification values, self-computed
MASTER_SECRET = int("573C0D40 FABF905D 72B44716 380D2E54 C5A48FD4 3B40D345 A3619881 D3E8632B".replace(" ", ""), 16)
M1 = int("D67B66EE 8621C267 7BFD97E7 82480762 5693212F AE9599D9 59A03F82 0F4E815C".replace(" ", ""), 16)
M2 = int("53EEEE88 4F3309A0 6645299F F457AAD0 FB724151 B872B44F 2382F52D C0D0E820".replace(" ", ""), 16)


def test_srp_small_parameters():
    group = SRPGroup.SMALL
    assert group.bits == 1024
    assert group.multiplier == K


def test_compute_server_public_value():
    b_priv, b_pub = SRP_HANDLER.compute_server_public_value(V, B_PRIV)
    assert b_priv == B_PRIV
    assert b_pub == B_PUB


def test_compute_u():
    u = SRP_HANDLER.compute_u(A_PUB, B_PUB)
    assert u == U


def test_compute_premaster_secret():
    premaster_secret = SRP_HANDLER.compute_premaster_secret(A_PUB, B_PRIV, U, V)
    assert premaster_secret == PREMASTER_SECRET


def test_premaster_to_master():
    master_secret = SRP_HANDLER.premaster_to_master(PREMASTER_SECRET)
    assert master_secret == long_to_bytes(MASTER_SECRET)

    assert (
        SRP_HANDLER.premaster_to_master(
            0x27A46FA771529CA3E8B757E54A32762B937752D18301AACB8D0393223B822F0FAE0E202D70B0B5FCB6C171DDE8A6D06FE1EC380BB7F22C78881379345FB59DF3FBC5CBC8163DE42D67B6072AF2BCFA96EE4C19CAC79AE3A4208AA086588B925EDE89510B8A89B3B1B8B6A95E57E8D6D9EB95F9817D3EDDD09F8C8D2A0190E18,
        ).hex()
        == "d369ace03853d18034a54282ee1b7b18d3b52bf390531b758d3bd568889284cb"
    )

    assert (
        SRP_HANDLER.premaster_to_master(
            bytes_to_long(
                b"\x01\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11"
            ),
        ).hex()
        == "0604da4fcae78f8e6aeaa51ddabb300a45cf540e61f1f344246405c1f7df5741"
    )

    # Edge cases of premaster being less than required number of bits
    assert (
        SRP_HANDLER.premaster_to_master(0).hex() == "040689c9dbffcf94620acdeec5686d8c35d1c85f8f3c1a70b988d58ed33ea148"
    )
    assert (
        SRP_HANDLER.premaster_to_master(1).hex() == "51a54a0e5a2bc61493b51cee861c8834e05303c0e1212c5728e5dad227a787b1"
    )
    assert (
        SRP_HANDLER.premaster_to_master(16).hex() == "284275fd923e817376bd2da1f948d15a19a8d08625d28a76be93d12648f4c251"
    )
    assert (
        SRP_HANDLER.premaster_to_master(bytes_to_long(b"TEST")).hex()
        == "fbae899ee2dbef77f824b06cbd0cb0f92e7c9108a5f9e072a596f4ea550d2d32"
    )


def test_generate_m1():
    m1 = SRP_HANDLER.generate_m1(long_to_bytes(S), A_PUB, B_PUB, SRP_HANDLER.premaster_to_master(PREMASTER_SECRET))
    assert m1 == long_to_bytes(M1)


def test_generate_m2():
    m2 = SRP_HANDLER.generate_m2(A_PUB, long_to_bytes(M1), SRP_HANDLER.premaster_to_master(PREMASTER_SECRET))
    assert m2 == long_to_bytes(M2)
