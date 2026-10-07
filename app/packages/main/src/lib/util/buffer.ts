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
 * @throws {Error} If `buffer.length > n`.
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
 */
export function xorBuffer(a: Buffer, b: Buffer): Buffer {
    return Buffer.from(a.map((value, index) => value ^ b[index]));
}

/**
 * Length-prefixes each buffer and concatenates them together into one singular buffer.
 *
 * @param parts parts to concatenate
 * @param prefixLen length of each length prefix, in bytes
 * @returns length-prefixed concatenation of {@link parts}
 */
export function frame(parts: Buffer[], prefixLen: number = 4): Buffer {
    const framed = parts.map((part) => {
        const prefix = Buffer.alloc(prefixLen);
        prefix.writeUIntBE(part.length, 0, prefixLen);
        return Buffer.concat([prefix, part]);
    });
    return Buffer.concat(framed);
}

/**
 * Writes an 8-byte big-endian unsigned integer into a buffer.
 *
 * @param buffer buffer to write into
 * @param value value to write
 * @param offset offset at which to write
 */
export function writeUInt64BE(buffer: Buffer, value: number, offset: number): void {
    buffer.write(value.toString(16).padStart(16, "0"), offset, 8, "hex");
}

/**
 * Writes an 8-byte big-endian unsigned integer into a fresh buffer.
 *
 * @param value value to write
 * @returns an 8-byte buffer
 */
export function uint64BE(value: number): Buffer {
    const buffer = Buffer.alloc(8);
    writeUInt64BE(buffer, value, 0);
    return buffer;
}

/**
 * Reads an 8-byte big-endian unsigned integer from a buffer.
 *
 * @param buffer buffer to read from
 * @param offset offset at which to read
 * @returns the value read
 * @throws {Error} if the value is not exactly representable as a number
 */
export function readUInt64BE(buffer: Buffer, offset: number): number {
    const value = BigInt(`0x${buffer.toString("hex", offset, offset + 8)}`);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("64-bit field is too large");
    }
    return Number(value);
}

/**
 * Compares two buffers for equality in constant time.
 *
 * @param a first buffer
 * @param b second buffer
 * @returns whether the buffers are equal
 */
export function bufferEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}
