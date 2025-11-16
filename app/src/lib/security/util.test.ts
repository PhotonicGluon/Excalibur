import { expect } from "vitest";

import { randID, randbits } from "./util";

test("randbits", () => {
    const rand1 = randbits(8);
    expect(rand1).toBeGreaterThanOrEqual(0n);
    expect(rand1).toBeLessThan(256n); // 256 = 2^8

    expect(randbits(0)).toBe(0n);

    expect(randbits(5)).toBeLessThan(32n);
});

test("randID", () => {
    const id = randID();
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
});
