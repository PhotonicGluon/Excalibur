import { expect } from "vitest";

import { changeTimezone, timestampToDateString } from "./date";

test("changeTimezone", () => {
    const date = new Date("2020-01-02T03:04:05Z");
    const timezone = "Asia/Singapore"; // UTC+8
    const result = changeTimezone(date, timezone);
    expect(result.toLocaleString()).toBe("1/2/2020, 11:04:05 AM");
});

test("timestampToDateString", () => {
    expect(timestampToDateString(1577934245, "UTC")).toBe("2020-01-02 03:04:05");
    expect(timestampToDateString(1640995200, "UTC")).toBe("2022-01-01 00:00:00");
    expect(timestampToDateString(1767225599, "UTC")).toBe("2025-12-31 23:59:59");
});
