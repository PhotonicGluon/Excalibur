import { bufferToNumber, numberToBuffer, padBuffer } from "./util";

test("numberToBuffer", () => {
    expect(numberToBuffer(3n)).toEqual(Buffer.from("03", "hex"));
    expect(numberToBuffer(BigInt("0xdeadbeef"))).toEqual(Buffer.from("deadbeef", "hex"));
    expect(
        numberToBuffer(
            BigInt(
                "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef",
            ),
        ),
    ).toEqual(
        Buffer.from(
            "9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef",
            "hex",
        ),
    );
});

test("bufferToNumber", () => {
    expect(bufferToNumber(Buffer.from("03", "hex"))).toEqual(3n);
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

test("padBuffer", () => {
    expect(padBuffer(Buffer.from("deadbeef", "hex"), 12)).toEqual(Buffer.from("0000000000000000deadbeef", "hex"));
    expect(padBuffer(Buffer.from("deadbeef", "hex"), 4)).toEqual(Buffer.from("deadbeef", "hex"));
    expect(() => padBuffer(Buffer.from("deadbeef", "hex"), 3)).toThrow();
});
