import { bufferToNumber } from "@lib/util/buffer";

import { SRPGroup, getSRPGroup } from "./srp";

// RFC5054 Appendix B test vectors
const S = Buffer.from("BEB25379 D1A8581E B5A72767 3A2441EE".replaceAll(" ", ""), "hex");
const X = Buffer.from("94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124".replaceAll(" ", ""), "hex");
const V = Buffer.from(
    "7E273DE8 696FFC4F 4E337D05 B4B375BE B0DDE156 9E8FA00A 9886D812 9BADA1F1 822223CA 1A605B53 0E379BA4 729FDC59 F105B478 7E5186F5 C671085A 1447B52A 48CF1970 B4FB6F84 00BBF4CE BFBB1681 52E08AB5 EA53D15C 1AFF87B2 B9DA6E04 E058AD51 CC72BFC9 033B564E 26480D78 E955A5E2 9E7AB245 DB2BE315 E2099AFB".replaceAll(
        " ",
        "",
    ),
    "hex",
);

const A_PRIV = Buffer.from(
    "60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393".replaceAll(" ", ""),
    "hex",
);
const A_PUB = Buffer.from(
    "61D5E490 F6F1B795 47B0704C 436F523D D0E560F0 C64115BB 72557EC4 4352E890 3211C046 92272D8B 2D1A5358 A2CF1B6E 0BFCF99F 921530EC 8E393561 79EAE45E 42BA92AE ACED8251 71E1E8B9 AF6D9C03 E1327F44 BE087EF0 6530E69F 66615261 EEF54073 CA11CF58 58F0EDFD FE15EFEA B349EF5D 76988A36 72FAC47B 0769447B".replaceAll(
        " ",
        "",
    ),
    "hex",
);
const B_PUB = Buffer.from(
    "BD0C6151 2C692C0C B6D041FA 01BB152D 4916A1E7 7AF46AE1 05393011 BAF38964 DC46A067 0DD125B9 5A981652 236F99D9 B681CBF8 7837EC99 6C6DA044 53728610 D0C6DDB5 8B318885 D7D82C7F 8DEB75CE 7BD4FBAA 37089E6F 9C6059F3 88838E7A 00030B33 1EB76840 910440B1 B27AAEAE EB4012B7 D7665238 A8E3FB00 4B117B58".replaceAll(
        " ",
        "",
    ),
    "hex",
);
const U = Buffer.from("CE38B959 3487DA98 554ED47D 70A7AE5F 462EF019".replaceAll(" ", ""), "hex");
const PREMASTER_SECRET = Buffer.from(
    "B0DC82BA BCF30674 AE450C02 87745E79 90A3381F 63B387AA F271A10D233861E3 59B48220 F7C4693C 9AE12B0A 6F67809F 0876E2D0 13800D6C41BB59B6 D5979B5C 00A172B4 A2A5903A 0BDCAF8A 709585EB 2AFAFA8F3499B200 210DCC1F 10EB3394 3CD67FC8 8A2F39A4 BE5BEC4E C0A3212DC346D7E4 74B29EDE 8A469FFE CA686E5A".replaceAll(
        " ",
        "",
    ),
    "hex",
);

// Verification values, self-computed
const MASTER_SECRET = Buffer.from(
    "573C0D40 FABF905D 72B44716 380D2E54 C5A48FD4 3B40D345 A3619881 D3E8632B".replaceAll(" ", ""),
    "hex",
);
const M1 = Buffer.from(
    "D67B66EE 8621C267 7BFD97E7 82480762 5693212F AE9599D9 59A03F82 0F4E815C".replaceAll(" ", ""),
    "hex",
);
const M2 = Buffer.from(
    "53EEEE88 4F3309A0 6645299F F457AAD0 FB724151 B872B44F 2382F52D C0D0E820".replaceAll(" ", ""),
    "hex",
);

// Tests
test("generateVerifier", () => {
    expect(SRPGroup.SMALL.generateVerifier(X)).toEqual(bufferToNumber(V));
});

test("getSRPGroup", () => {
    expect(getSRPGroup(1024)).toEqual(SRPGroup.SMALL);
    expect(getSRPGroup(1536)).toEqual(SRPGroup.MEDIUM);
    expect(getSRPGroup(2048)).toEqual(SRPGroup.LARGE);
    expect(() => getSRPGroup(1234)).toThrow();
});

test("computeU", () => {
    expect(SRPGroup.SMALL.computeU(bufferToNumber(A_PUB), bufferToNumber(B_PUB))).toEqual(bufferToNumber(U));
});

test("computePremasterSecret", () => {
    expect(
        SRPGroup.SMALL.computePremasterSecret(bufferToNumber(A_PRIV), bufferToNumber(B_PUB), X, bufferToNumber(U)),
    ).toEqual(bufferToNumber(PREMASTER_SECRET));
});

test("premasterToMaster", () => {
    expect(SRPGroup.SMALL.premasterToMaster(bufferToNumber(PREMASTER_SECRET))).toEqual(MASTER_SECRET);

    // Edge cases of premaster being less than required number of bits
    expect(SRPGroup.SMALL.premasterToMaster(0n).toString("hex")).toEqual(
        "040689c9dbffcf94620acdeec5686d8c35d1c85f8f3c1a70b988d58ed33ea148",
    );
    expect(SRPGroup.SMALL.premasterToMaster(1n).toString("hex")).toEqual(
        "51a54a0e5a2bc61493b51cee861c8834e05303c0e1212c5728e5dad227a787b1",
    );
    expect(SRPGroup.SMALL.premasterToMaster(16n).toString("hex")).toEqual(
        "284275fd923e817376bd2da1f948d15a19a8d08625d28a76be93d12648f4c251",
    );
    expect(SRPGroup.SMALL.premasterToMaster(bufferToNumber(Buffer.from("TEST"))).toString("hex")).toEqual(
        "fbae899ee2dbef77f824b06cbd0cb0f92e7c9108a5f9e072a596f4ea550d2d32",
    );
    expect(
        SRPGroup.SMALL.premasterToMaster(
            bufferToNumber(
                Buffer.from(
                    "\x01\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11\x11",
                ),
            ),
        ).toString("hex"),
    ).toEqual("0604da4fcae78f8e6aeaa51ddabb300a45cf540e61f1f344246405c1f7df5741");
});

test("generateM1", () => {
    expect(
        SRPGroup.SMALL.generateM1(
            S,
            bufferToNumber(A_PUB),
            bufferToNumber(B_PUB),
            SRPGroup.SMALL.premasterToMaster(bufferToNumber(PREMASTER_SECRET)),
        ),
    ).toEqual(M1);
});

test("generateM2", () => {
    expect(
        SRPGroup.SMALL.generateM2(
            bufferToNumber(A_PUB),
            M1,
            SRPGroup.SMALL.premasterToMaster(bufferToNumber(PREMASTER_SECRET)),
        ),
    ).toEqual(M2);
});
