import { bytesToHumanReadable } from "./units";

test("bytesToHumanReadable", () => {
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
