/**
 * Convert a BigInt to a Buffer.
 *
 * @param n The number to convert.
 * @returns The buffer representing the number.
 */
export function numberToBuffer(n: bigint): Buffer {
    const string = n.toString(16);
    return Buffer.from(n < 16n ? `0${string}` : string, "hex");
}

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

/**
 * Pad a buffer with leading zeros *on the left* so that it is `n` bytes long.
 *
 * @param buffer The buffer to pad.
 * @param n The desired length of the buffer.
 * @returns A new buffer of length `n` with `buffer` as its suffix.
 * @throws Error if `buffer.length > n`.
 */
export function padBuffer(buffer: Buffer, n: number): Buffer {
    if (buffer.length > n) {
        throw new Error(`Buffer too long to pad (${buffer.length} > ${n})`);
    }
    const padding = Buffer.alloc(n - buffer.length);
    return Buffer.concat([padding, buffer]);
}
