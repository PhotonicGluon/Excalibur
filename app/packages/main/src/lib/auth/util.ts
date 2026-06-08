import randomBytes from "randombytes";

import { bufferToNumber } from "@lib/util";

/**
 * Generates a random number with the specified number of bits.
 *
 * @param bits The number of bits for the generated number.
 * @returns A random number with the specified number of bits.
 */
export function randbits(bits: number): bigint {
    const mask = BigInt((1n << BigInt(bits)) - 1n);
    const bytes = randomBytes(Math.ceil(bits / 8));
    return mask & bufferToNumber(bytes);
}

/**
 * @returns A random ID
 */
export function randID() {
    const LENGTH = 32;
    const bytes = randomBytes(LENGTH / 2); // Divide by 2 since each byte is 2 hex characters
    return bytes.toString("hex");
}
