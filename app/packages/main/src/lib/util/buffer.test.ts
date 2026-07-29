import { expect } from "vitest";

import { bufferToNumber, numberToBuffer, padBuffer, readUInt64BE, writeUInt64BE, xorBuffer } from "./buffer";

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

test("xorBuffer", () => {
    expect(xorBuffer(Buffer.from("deadbeef", "hex"), Buffer.from("facedead", "hex"))).toEqual(
        Buffer.from("24636042", "hex"),
    );
    expect(xorBuffer(Buffer.from("deadbeef", "hex"), Buffer.from("deadbeef", "hex"))).toEqual(
        Buffer.from("00000000", "hex"),
    );
});

test("writeUInt64BE", () => {
    const buffer = Buffer.alloc(8);
    writeUInt64BE(buffer, 0, 0);
    expect(buffer).toEqual(Buffer.from("0000000000000000", "hex"));

    writeUInt64BE(buffer, 0xdeadbeef, 0);
    expect(buffer).toEqual(Buffer.from("00000000deadbeef", "hex"));

    writeUInt64BE(buffer, Number.MAX_SAFE_INTEGER, 0);
    expect(buffer).toEqual(Buffer.from("001fffffffffffff", "hex"));

    // Writing at a non-zero offset should leave the surrounding bytes untouched
    const offsetBuffer = Buffer.alloc(12, 0xff);
    writeUInt64BE(offsetBuffer, 0x11111, 2);
    expect(offsetBuffer).toEqual(Buffer.from("ffff0000000000011111ffff", "hex"));
});

test("readUInt64BE", () => {
    expect(readUInt64BE(Buffer.from("0000000000000000", "hex"), 0)).toEqual(0);
    expect(readUInt64BE(Buffer.from("00000000deadbeef", "hex"), 0)).toEqual(0xdeadbeef);
    expect(readUInt64BE(Buffer.from("001fffffffffffff", "hex"), 0)).toEqual(Number.MAX_SAFE_INTEGER);

    expect(readUInt64BE(Buffer.from("ffff0000000000011111ffff", "hex"), 2)).toEqual(0x11111);

    // Anything above `Number.MAX_SAFE_INTEGER` is not exactly representable
    expect(() => readUInt64BE(Buffer.from("0020000000000000", "hex"), 0)).toThrow();
    expect(() => readUInt64BE(Buffer.from("ffffffffffffffff", "hex"), 0)).toThrow();
});
