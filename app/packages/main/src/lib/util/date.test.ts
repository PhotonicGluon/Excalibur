import { expect } from "vitest";

import { timestampToDateString } from "./date";

test("timestampToDateString", () => {
    expect(timestampToDateString(1577934245)).toBe("2020-01-02 03:04:05");
    expect(timestampToDateString(1640995200)).toBe("2022-01-01 00:00:00");
    expect(timestampToDateString(1767225599)).toBe("2025-12-31 23:59:59");
});
