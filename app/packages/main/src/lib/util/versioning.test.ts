import { expect } from "vitest";

import { isPrerelease } from "./versioning";

describe("isPrerelease", () => {
    it("should return true for prerelease versions", () => {
        expect(isPrerelease("1.0.0-alpha")).toBe(true);
        expect(isPrerelease("1.0.0-beta")).toBe(true);
        expect(isPrerelease("1.0.0-rc")).toBe(true);

        expect(isPrerelease("1.0.0-alpha.1")).toBe(true);
        expect(isPrerelease("1.0.0-beta.2")).toBe(true);
        expect(isPrerelease("1.0.0-rc.3")).toBe(true);
    });

    it("should return false for non-prerelease versions", () => {
        expect(isPrerelease("1.0.0")).toBe(false);
        expect(isPrerelease("1.0.0+build")).toBe(false);
    });
});
