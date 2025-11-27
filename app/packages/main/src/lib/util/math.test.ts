import { expect } from "vitest";

import { modulo, powmod } from "./math";

test("modulo", () => {
    // Well-defined
    expect(modulo(4n, 3n)).toEqual(1n);
    expect(modulo(-4n, 3n)).toEqual(2n);

    // Not-well defined, but these are the expected results
    expect(modulo(4n, -3n)).toEqual(-2n);
    expect(modulo(-4n, -3n)).toEqual(-1n);
});

test("powmod", () => {
    expect(powmod(2n, 3n, 5n)).toEqual(3n);
    expect(powmod(2n, 4n, 5n)).toEqual(1n);
    expect(powmod(2n, 5n, 7n)).toEqual(4n);
});
