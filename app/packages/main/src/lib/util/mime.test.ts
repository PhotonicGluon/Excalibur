import { expect } from "vitest";

import { getMIMEType } from "./mime";

test("getMIMEType", () => {
    expect(getMIMEType("test.txt")).toBe("text/plain");
    expect(getMIMEType("test.json")).toBe("application/json");
    expect(getMIMEType("test.json.exef")).toBe("application/json");
    expect(getMIMEType("test")).toBe(null);
});
