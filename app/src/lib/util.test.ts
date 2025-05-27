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

    expect(numberToBuffer(0n)).toEqual(Buffer.from("00", "hex"));
    expect(numberToBuffer(0x11111n)).toEqual(Buffer.from("011111", "hex"));
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

    expect(bufferToNumber(Buffer.from("00", "hex"))).toEqual(0n);
});

test("bufferToNumber and numberToBuffer inverses", () => {
    expect(bufferToNumber(numberToBuffer(3n))).toEqual(3n);
    expect(numberToBuffer(bufferToNumber(Buffer.from("\x03")))).toEqual(Buffer.from("03", "hex"));

    expect(bufferToNumber(numberToBuffer(0x11111n))).toEqual(0x11111n);
    expect(numberToBuffer(bufferToNumber(Buffer.from("\x01\x11\x11")))).toEqual(Buffer.from("\x01\x11\x11"));
});

test("padBuffer", () => {
    expect(padBuffer(Buffer.from("deadbeef", "hex"), 12)).toEqual(Buffer.from("0000000000000000deadbeef", "hex"));
    expect(padBuffer(Buffer.from("deadbeef", "hex"), 4)).toEqual(Buffer.from("deadbeef", "hex"));
    expect(() => padBuffer(Buffer.from("deadbeef", "hex"), 3)).toThrow();
});
