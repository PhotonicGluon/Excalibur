import { randomBytes } from "crypto";

import { bufferToNumber } from "@lib/util";

/**
 * Generates a random number with the specified number of bits.
 *
 * @param bits The number of bits for the generated number. Must be a multiple of 8.
 * @returns A random number with the specified number of bits.
 * @throws Error if `bits` is not a multiple of 8.
 */
export function randbits(bits: number): bigint {
    if (bits === 0) {
        return 0n;
    }
    if (bits % 8 !== 0) {
        throw new Error("Bits must be a multiple of 8");
    }

    const bytes = randomBytes(Math.ceil(bits / 8));
    return bufferToNumber(bytes);
}
