/**
 * Convert a BigInt to a Buffer.
 *
 * @param n The number to convert.
 * @returns The buffer representing the number.
 */
export function numberToBuffer(n: bigint): Buffer {
    const string = n.toString(16);
    return Buffer.from(string.length % 2 ? `0${string}` : string, "hex");
}

/**
 * Convert a Buffer to a BigInt.
 *
 * @param buffer The buffer to convert.
 * @returns The number represented by the buffer.
 */
export function bufferToNumber(buffer: Buffer): bigint {
    let hex = buffer.toString("hex");
    if (hex === "") {
        hex = "0";
    }
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

/**
 * Compute the element-wise XOR of two buffers.
 *
 * @param a The first buffer.
 * @param b The second buffer.
 * @returns A new buffer with the same length as `a` and `b`, where each element is the XOR of the
 *          corresponding elements in `a` and `b`.
 * @throws Error if `a.length != b.length`.
 */
export function xorBuffer(a: Buffer, b: Buffer): Buffer {
    if (a.length !== b.length) {
        throw new Error(`Buffers must be the same length (${a.length} != ${b.length})`);
    }

    const result = Buffer.alloc(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}
