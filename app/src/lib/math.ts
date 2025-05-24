/**
 * Calculates the modular exponentiation of `base` to the `power` with modulus `mod`.
 *
 * This is done using the "exponentiation by squaring" algorithm.
 *
 * @param base The base number.
 * @param power The exponent.
 * @param mod The modulus.
 * @returns The value of `base` to the `power` with modulus `mod`.
 */
export function powmod(base: bigint, power: bigint, mod: bigint): bigint {
    if (power == 0n) {
        return 1n;
    }
    if (power % 2n == 0n) {
        const sqrt = powmod(base, power / 2n, mod);
        return (sqrt * sqrt) % mod;
    } else {
        return (base * powmod(base, power - 1n, mod)) % mod;
    }
}
