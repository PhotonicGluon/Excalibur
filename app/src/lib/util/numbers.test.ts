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
        expect(bytesToHumanReadable(0)).toBe("0 B");
        expect(bytesToHumanReadable(1)).toBe("1 B");

        expect(bytesToHumanReadable(999)).toBe("999 B");
        expect(bytesToHumanReadable(1000)).toBe("1.00 KB");
        expect(bytesToHumanReadable(1000, true)).toBe("1000 B");
        expect(bytesToHumanReadable(1024, true)).toBe("1.00 KiB");

        expect(bytesToHumanReadable(123456789)).toBe("123.46 MB");
        expect(bytesToHumanReadable(123456789, true)).toBe("117.74 MiB");

        expect(bytesToHumanReadable(1234567890)).toBe("1.23 GB");
        expect(bytesToHumanReadable(1234567890, true)).toBe("1.15 GiB");
    });
});
