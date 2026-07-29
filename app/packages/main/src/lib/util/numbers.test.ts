import { expect } from "vitest";

import { bigIntToBytes, bitLength, bytesToBigInt, bytesToHumanReadable, padNumber } from "./numbers";

describe("padNumber", () => {
    test("pads numbers correctly", () => {
        expect(padNumber(1, 2)).toBe("01");
        expect(padNumber(123, 2)).toBe("123");
        expect(padNumber(123, 3)).toBe("123");
        expect(padNumber(123, 4)).toBe("0123");
        expect(padNumber(12, 5)).toBe("00012");
    });
});

describe("bitLength", () => {
    test("calculates bit length correctly", () => {
        expect(bitLength(0n)).toBe(0n);
        expect(bitLength(1n)).toBe(1n);
        expect(bitLength(2n)).toBe(2n);
        expect(bitLength(3n)).toBe(2n);
        expect(bitLength(4n)).toBe(3n);
        expect(bitLength(15n)).toBe(4n);
        expect(bitLength(16n)).toBe(5n);
    });
});

describe("bytesToBigInt", () => {
    test("converts bytes to bigint", () => {
        expect(bytesToBigInt(new Uint8Array([0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]), "big")).toBe(
            12345678901234567890n,
        );
        expect(
            bytesToBigInt(
                new Uint8Array([0x00, 0x00, 0x00, 0x00, 0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]),
                "big",
            ),
        ).toBe(12345678901234567890n);
        expect(bytesToBigInt(new Uint8Array([0xd2, 0x0a, 0x1f, 0xeb, 0x8c, 0xa9, 0x54, 0xab]), "little")).toBe(
            12345678901234567890n,
        );
        expect(
            bytesToBigInt(
                new Uint8Array([0xd2, 0x0a, 0x1f, 0xeb, 0x8c, 0xa9, 0x54, 0xab, 0x00, 0x00, 0x00, 0x00]),
                "little",
            ),
        ).toBe(12345678901234567890n);
    });

    test("handles edge cases", () => {
        expect(bytesToBigInt(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), "big")).toBe(0n);
        expect(bytesToBigInt(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), "little")).toBe(0n);
    });
});

describe("bigIntToBytes", () => {
    test("converts bigint to bytes", () => {
        expect(bigIntToBytes(12345678901234567890n, 8, "big")).toEqual(
            new Uint8Array([0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]),
        );
        expect(bigIntToBytes(12345678901234567890n, 12, "big")).toEqual(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]),
        );
        expect(bigIntToBytes(12345678901234567890n, 8, "little")).toEqual(
            new Uint8Array([0xd2, 0x0a, 0x1f, 0xeb, 0x8c, 0xa9, 0x54, 0xab]),
        );
        expect(bigIntToBytes(12345678901234567890n, 12, "little")).toEqual(
            new Uint8Array([0xd2, 0x0a, 0x1f, 0xeb, 0x8c, 0xa9, 0x54, 0xab, 0x00, 0x00, 0x00, 0x00]),
        );
    });
});

describe("bytesToHumanReadable", () => {
    test("converts bytes to human readable format", () => {
        expect(bytesToHumanReadable(0, "si")).toBe("0 B");
        expect(bytesToHumanReadable(1, "si")).toBe("1 B");

        expect(bytesToHumanReadable(999, "si")).toBe("999 B");
        expect(bytesToHumanReadable(1000, "si")).toBe("1.00 kB");
        expect(bytesToHumanReadable(1000, "iec")).toBe("1000 B");
        expect(bytesToHumanReadable(1024, "iec")).toBe("1.00 KiB");

        expect(bytesToHumanReadable(123456789, "si")).toBe("123.46 MB");
        expect(bytesToHumanReadable(123456789, "iec")).toBe("117.74 MiB");

        expect(bytesToHumanReadable(1234567890, "si")).toBe("1.23 GB");
        expect(bytesToHumanReadable(1234567890, "iec")).toBe("1.15 GiB");
    });
});
