import { expect } from "vitest";

import { getURLEncodedPath } from "./url";

describe("getURLEncodedPath", () => {
    it("no path", () => {
        expect(getURLEncodedPath("http://example.com")).toBe("/");
    });

    it("with simple path", () => {
        expect(getURLEncodedPath("http://example.com/test")).toBe("/test");
    });

    it("path with spaces", () => {
        expect(getURLEncodedPath("http://example.com/John Doe")).toBe("/John%20Doe");
    });

    it("path with slashes", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe")).toBe("/John/Doe");
    });

    it("path with slashes and spaces", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe Jr")).toBe("/John/Doe%20Jr");
    });

    it("path with mixed characters", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe+the III")).toBe("/John/Doe%2Bthe%20III");
    });

    it("path with unicode", () => {
        expect(getURLEncodedPath("http://example.com/測試/測")).toBe("/%E6%B8%AC%E8%A9%A6/%E6%B8%AC");
    });
});
