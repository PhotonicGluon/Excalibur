/**
 * Returns the positive remainder of dividing `a` by `b`. This is different from the `%` operator
 * in that it always returns a positive result, even if `a` is negative.
 *
 * It is not expected to work for non-positive `b`.
 *
 * @param a The dividend.
 * @param b The divisor. Well-defined if this is positive.
 * @returns The positive remainder of dividing `a` by `b`.
 */
export function modulo(a: bigint, b: bigint): bigint {
    return ((a % b) + b) % b;
}

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
        return modulo(sqrt * sqrt, mod);
    } else {
        return modulo(base * powmod(base, power - 1n, mod), mod);
    }
}
