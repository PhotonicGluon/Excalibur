import createHash from "create-hash";

/**
 * Computes the SHA256 hash of a data buffer.
 *
 * @param data the data buffer
 * @returns SHA256 hash of the buffer
 */
export function sha256(data: Buffer): Buffer {
    return createHash("sha256").update(data).digest();
}
