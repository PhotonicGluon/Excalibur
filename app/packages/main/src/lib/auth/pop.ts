import { createHmac, randomBytes } from "crypto";

import { b64encode } from "@lib/util";

/**
 * Generates a Proof of Possession (PoP).
 *
 * @param masterKey The master key
 * @param method The HTTP method
 * @param path The path
 * @param timestamp The timestamp
 * @param nonce The nonce
 * @returns The PoP
 */
export function generatePoP(masterKey: Buffer, method: string, path: string, timestamp: number, nonce: Buffer): Buffer {
    const hmacMsg = `${method} ${path} ${timestamp} `;
    return createHmac("sha256", masterKey).update(hmacMsg).update(nonce).digest();
}

/**
 * Generates a Proof of Possession (PoP) header.
 *
 * @param masterKey The master key
 * @param method The HTTP method
 * @param path The path
 * @param timestamp The timestamp; if not provided, the current time is used
 * @param nonce The nonce; if not provided, a random nonce is generated
 * @returns The PoP header
 */
export function generatePoPHeader(
    masterKey: Buffer,
    method: string,
    path: string,
    timestamp?: number,
    nonce?: Buffer,
): string {
    timestamp = timestamp ?? Math.floor(Date.now() / 1e3);
    nonce = nonce ?? randomBytes(16);
    const pop = generatePoP(masterKey, method, path, timestamp, nonce);
    return `${timestamp} ${b64encode(nonce)} ${b64encode(pop)}`;
}
