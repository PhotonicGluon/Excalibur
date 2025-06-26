import { randbits } from "./util";

test("randbits", () => {
    const rand1 = randbits(8);
    expect(rand1).toBeGreaterThanOrEqual(0n);
    expect(rand1).toBeLessThan(256n); // 256 = 2^8

    expect(randbits(0)).toBe(0n);

    expect(randbits(5)).toBeLessThan(32n);
});
