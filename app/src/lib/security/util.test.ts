import { randbits } from "./util";

test("randbits", () => {
    const rand1 = randbits(8);
    expect(rand1).toBeGreaterThan(0n);
    expect(rand1).toBeLessThan(256n); // 256 = 2^8

    const rand2 = randbits(0);
    expect(rand2).toBe(0n);

    expect(randbits(5)).toBeLessThan(32n);
});
