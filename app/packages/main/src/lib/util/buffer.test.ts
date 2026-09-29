import { expect } from "vitest";

import {
    bufferEqual,
    bufferToNumber,
    frame,
    numberToBuffer,
    padBuffer,
    readUInt64BE,
    uint64BE,
    writeUInt64BE,
    xorBuffer,
} from "./buffer";

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

describe("frame", () => {
    it("should length-prefix and concatenate parts", () => {
        const result = frame([Buffer.from("ab", "hex"), Buffer.from("cdef", "hex")]);
        expect(result.toString("hex")).toEqual("00000001ab00000002cdef");
    });

    it("should handle different prefix lengths", () => {
        const result = frame([Buffer.from("ab", "hex"), Buffer.from("cdef", "hex")], 2);
        expect(result.toString("hex")).toEqual("0001ab0002cdef");
    });

    it("should handle empty parts", () => {
        const result = frame([Buffer.alloc(0), Buffer.from("ab", "hex")]);
        expect(result.toString("hex")).toEqual("0000000000000001ab");
    });

    it("should produce different output for different splits of the same bytes", () => {
        const a = frame([Buffer.from("abcd", "hex"), Buffer.from("ef", "hex")]);
        const b = frame([Buffer.from("ab", "hex"), Buffer.from("cdef", "hex")]);
        expect(a.equals(b)).toBe(false);
    });
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

test("uint64BE", () => {
    expect(uint64BE(0)).toEqual(Buffer.from("0000000000000000", "hex"));
    expect(uint64BE(0xdeadbeef)).toEqual(Buffer.from("00000000deadbeef", "hex"));
    expect(uint64BE(Number.MAX_SAFE_INTEGER)).toEqual(Buffer.from("001fffffffffffff", "hex"));
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

test("bufferEqual", () => {
    expect(bufferEqual(Buffer.from("deadbeef", "hex"), Buffer.from("deadbeef", "hex"))).toBe(true);
    expect(bufferEqual(Buffer.from("deadbeef", "hex"), Buffer.from("facedead", "hex"))).toBe(false);
    expect(bufferEqual(Buffer.from("deadbeef", "hex"), Buffer.from("deadbeefff", "hex"))).toBe(false);
    expect(bufferEqual(Buffer.from("deadbeef", "hex"), Buffer.from("deadbeef", "hex"))).toBe(true);
});
