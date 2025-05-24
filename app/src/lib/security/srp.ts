import { powmod } from "@lib/math";
import { bufferToNumber } from "@lib/util";

/**
 * Generates the SRP verifier for the given key, generator, and modulus.
 *
 * @param key The key as a buffer, which will be converted to a bigint.
 * @param generator The generator as a bigint.
 * @param modulus The modulus as a bigint.
 * @returns The computed verifier as a bigint.
 */
export function generateVerifier(key: Buffer, generator: bigint, modulus: bigint): bigint {
    const keyInt = bufferToNumber(key);
    return powmod(generator, keyInt, modulus);
}
