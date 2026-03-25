import { bigIntToBytes } from "@lib/util";

/**
 * Integer to octet string primitive (I2OSP) function described in RFC8017, section 4.1.
 *
 * @param value integer to convert
 * @param length length of the output byte string
 * @returns byte array
 */
export function i2osp(value: bigint, length: number): Uint8Array {
    return bigIntToBytes(value, length, "big");
}
