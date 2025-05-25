import { bufferToNumber } from "@lib/util";
import { getSRPGroup, SRPGroup } from "./srp";

test("generateVerifier", () => {
    // RFC5054 Appendix B test vector
    expect(
        SRPGroup.SMALL.generateVerifier(
            Buffer.from("94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124".replaceAll(" ", ""), "hex"),
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

test("getSRPGroup", () => {
    expect(getSRPGroup(1024)).toEqual(SRPGroup.SMALL);
    expect(getSRPGroup(1536)).toEqual(SRPGroup.MEDIUM);
    expect(getSRPGroup(2048)).toEqual(SRPGroup.LARGE);
    expect(() => getSRPGroup(1234)).toThrow();
});
