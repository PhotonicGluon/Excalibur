import { blake2b as _nobleBlake2b } from "@noble/hashes/blake2.js";
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

/**
 * Computes the BLAKE2b hash of a data buffer.
 *
 * @param data the data buffer
 * @param key optional MAC key
 * @returns 32-byte BLAKE2b hash of the buffer, which could be keyed using the {@link key}
 */
export function blake2b(data: Buffer, key?: Buffer): Buffer {
    const hash = _nobleBlake2b.create({ dkLen: 32, key });
    hash.update(data);
    return Buffer.from(hash.digest());
}
