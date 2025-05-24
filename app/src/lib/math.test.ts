import { powmod } from "./math";

test("test `powmod`", () => {
    expect(powmod(2n, 3n, 5n)).toEqual(3n);
    expect(powmod(2n, 4n, 5n)).toEqual(1n);
    expect(powmod(2n, 5n, 7n)).toEqual(4n);
});
