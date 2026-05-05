/**
 * Returns the sign of a number.
 *
 * @param x the number
 * @returns 1 if x is positive, -1 if x is negative, 0 if x is zero
 */
export function sgn(x: number): 1 | -1 | 0 {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
}

/**
 * Returns the positive remainder of dividing `a` by `b`. This is different from the `%` operator
 * in that it always returns a positive result, even if `a` is negative.
 *
 * It is not expected to work for non-positive `b`.
 *
 * @param a the dividend
 * @param b the divisor; well-defined if this is positive
 * @returns the positive remainder of dividing `a` by `b`
 */
export function modulo(a: bigint, b: bigint): bigint {
    return ((a % b) + b) % b;
}

/**
 * Calculates the modular exponentiation of `base` to the `power` with modulus `mod`.
 *
 * This is done using the "exponentiation by squaring" algorithm.
 *
 * @param base the base number
 * @param power the exponent
 * @param mod the modulus
 * @returns `base` to the `power` modulo `mod`
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

/**
 * Calculates the modular multiplicative inverse of `a` modulo `mod`.
 *
 * @param a The number to invert
 * @param mod The modulus
 * @returns The modular inverse
 * @throws {Error} if the inverse does not exist.
 */
export function modInv(a: bigint, mod: bigint): bigint {
    let [oldR, r] = [mod, a];
    let [oldT, t] = [0n, 1n];

    while (r !== 0n) {
        const quotient = oldR / r;
        [oldR, r] = [r, oldR - quotient * r];
        [oldT, t] = [t, oldT - quotient * t];
    }

    if (oldR !== 1n) {
        throw new Error("Modular inverse does not exist (gcd(a, mod) !== 1)");
    }

    return modulo(oldT, mod);
}
