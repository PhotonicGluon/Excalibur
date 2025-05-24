import { bufferToNumber } from "./util";

test("test `bufferToNumber`", () => {
    expect(bufferToNumber(Buffer.from("deadbeef", "hex"))).toEqual(BigInt("0xdeadbeef"));
    expect(
        bufferToNumber(
            Buffer.from(
                "9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef",
                "hex",
            ),
        ),
    ).toEqual(
        BigInt(
            "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef",
        ),
    );
});
