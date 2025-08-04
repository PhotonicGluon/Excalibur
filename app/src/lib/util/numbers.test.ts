import { bytesToHumanReadable, padNumber } from "./numbers";

describe("padNumber", () => {
    test("pads numbers correctly", () => {
        expect(padNumber(1, 2)).toBe("01");
        expect(padNumber(123, 2)).toBe("123");
        expect(padNumber(123, 3)).toBe("123");
        expect(padNumber(123, 4)).toBe("0123");
        expect(padNumber(12, 5)).toBe("00012");
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
