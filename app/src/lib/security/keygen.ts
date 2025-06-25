import { pbkdf2 } from "crypto";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes
const NUM_ITER = 650_000;

/**
 * Normalizes a password by:
 * 1. Removing leading/trailing whitespace
 * 2. Applying Unicode NFKD normalization
 * 3. Converting to UTF-8 byte array
 *
 * @param password The input password string
 * @returns UTF-8 byte array of the normalized password
 */
export function normalizePassword(password: string): Uint8Array {
    const trimmed = password.trim();
    const normalized = trimmed.normalize("NFKD");
    const encoder = new TextEncoder();
    return encoder.encode(normalized);
}

/**
 * Performs a slow hash using PBKDF2.
 *
 * @param passwordBuf The password buffer to be hashed.
 * @param salt The salt to be used.
 * @returns A promise that resolves to the hashed password.
 */
export async function slowHash(passwordBuf: Uint8Array, salt: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        pbkdf2(passwordBuf, salt, NUM_ITER, KEY_LENGTH, DIGEST_ALGORITHM, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(Buffer.from(derivedKey));
            }
        });
    });
}

/**
 * Generates a cryptographic key using PBKDF2.
 *
 * @param password The password to be used.
 * @param salt A buffer representing the salt value.
 * @returns A buffer containing the generated key.
 */
export default async function generateKey(password: string, salt: Buffer): Promise<Buffer> {
    const passwordBuf = normalizePassword(password);
    return await slowHash(passwordBuf, salt);
}
