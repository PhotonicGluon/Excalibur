/**
 * Encodes a string or buffer to a base64 string.
 *
 * @param input string or buffer to encode
 * @param padding whether to include padding characters
 * @returns base64 string
 */
export function b64encode(input: string | Buffer, padding: boolean = true): string {
    let buf = input;
    if (typeof input === "string") {
        buf = Buffer.from(input, "utf-8");
    }

    const b64 = buf.toString("base64");
    return padding ? b64 : b64.replace(/=/g, "");
}

/**
 * Decodes a base64 string to a buffer.
 *
 * @param input base64 string to decode
 * @returns buffer given by the base64 string
 */
export function b64decode(input: string): Buffer {
    return Buffer.from(input, "base64");
}

/**
 * Encodes a string or buffer to a URL-safe base64 string (see RFC4648, section 5).
 *
 * @param input string or buffer to encode
 * @param padding whether to include padding characters
 * @returns URL-safe base64 string
 */
export function b64encodeURLSafe(input: string | Buffer, padding: boolean = true): string {
    const rawB64 = b64encode(input, padding);
    return rawB64.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Decodes a URL-safe base64 string to a buffer.
 *
 * @param input URL-safe base64 string to decode
 * @returns buffer given by the URL-safe base64 string
 */
export function b64decodeURLSafe(input: string): Buffer {
    const rawB64 = input.replace(/-/g, "+").replace(/_/g, "/");
    return b64decode(rawB64);
}
