/**
 * Convert a Buffer to a BigInt.
 *
 * @param buffer The buffer to convert.
 * @returns The number represented by the buffer.
 */
export function bufferToNumber(buffer: Buffer): bigint {
    const hex = buffer.toString("hex");
    return BigInt("0x" + hex);
}
