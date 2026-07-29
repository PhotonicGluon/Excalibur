import { expect } from "vitest";
import PADME from "./padme";

describe("PADME", () => {
    it("should work for small values", () => {
        expect(PADME.computePaddedLength(0)).toBe(0);
        expect(PADME.computePaddedLength(1)).toBe(1);
    });

    describe("should be idempotent and non-shrinking", () => {
        for (const length of [0, 1, 2, 3, 7, 8, 9, 100, 1000, 4096, 4097, 100000, 2 ** 20, 2 ** 20 + 1]) {
            it(`for ${length}`, () => {
                const padded = PADME.computePaddedLength(length);
                expect(padded).toBeGreaterThanOrEqual(length);
                expect(PADME.computePaddedLength(padded)).toBe(padded);
                expect(PADME.isFixedPoint(padded)).toBe(true);
            });
        }
    });

    it("should reject negative lengths", () => {
        expect(() => PADME.computePaddedLength(-1)).toThrow("length must be non-negative");
        expect(PADME.isFixedPoint(-1)).toBe(false);
    });
});
