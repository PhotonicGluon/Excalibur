import { generateVerifier } from "./srp";
import { bufferToNumber } from "@lib/util";

test("test `generateVerifier`", () => {
    expect(generateVerifier(Buffer.from("03", "hex"), 5n, 11n)).toEqual(4n);
    expect(generateVerifier(Buffer.from("10000000", "hex"), 17n, 1000n)).toEqual(681n);
    expect(generateVerifier(Buffer.from("12345678", "hex"), 19n, 1327n)).toEqual(261n);

    // RFC5054 Appendix B test vector
    const prime = bufferToNumber(
        Buffer.from(
            "EEAF0AB9 ADB38DD6 9C33F80A FA8FC5E8 60726187 75FF3C0B 9EA2314C 9C256576 D674DF74 96EA81D3 383B4813 D692C6E0 E0D5D8E2 50B98BE4 8E495C1D 6089DAD1 5DC7D7B4 6154D6B6 CE8EF4AD 69B15D49 82559B29 7BCF1885 C529F566 660E57EC 68EDBC3C 05726CC0 2FD4CBF4 976EAA9A FD5138FE 8376435B 9FC61D2F C0EB06E3".replaceAll(
                " ",
                "",
            ),
            "hex",
        ),
    );
    const generator = 2n;

    expect(
        generateVerifier(
            Buffer.from("94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124".replaceAll(" ", ""), "hex"),
            generator,
            prime,
        ),
    ).toEqual(
        bufferToNumber(
            Buffer.from(
                "7E273DE8 696FFC4F 4E337D05 B4B375BE B0DDE156 9E8FA00A 9886D812 9BADA1F1 822223CA 1A605B53 0E379BA4 729FDC59 F105B478 7E5186F5 C671085A 1447B52A 48CF1970 B4FB6F84 00BBF4CE BFBB1681 52E08AB5 EA53D15C 1AFF87B2 B9DA6E04 E058AD51 CC72BFC9 033B564E 26480D78 E955A5E2 9E7AB245 DB2BE315 E2099AFB".replaceAll(
                    " ",
                    "",
                ),
                "hex",
            ),
        ),
    );
});
