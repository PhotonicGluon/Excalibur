import { createHmac } from "crypto";

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
 * @param timestamp The timestamp
 * @param nonce The nonce
 * @returns The PoP header
 */
export function generatePoPHeader(
    masterKey: Buffer,
    method: string,
    path: string,
    timestamp: number,
    nonce: Buffer,
): string {
    const pop = generatePoP(masterKey, method, path, timestamp, nonce);
    return `${timestamp} ${nonce.toString("base64")} ${pop.toString("base64")}`;
}
