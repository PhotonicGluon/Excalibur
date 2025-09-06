import hkdf from "@panva/hkdf";
import { pbkdf2 } from "crypto";

import { xorBuffer } from "@lib/util";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes
const SLOW_HASH_NUM_ITER = 650_000;

export interface KeygenAdditionalInfo {
    /** Username of the user */
    username: string;
}

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
 * @param passwordBuf The password buffer to be hashed
 * @param salt The salt to be used
 * @returns A promise that resolves to the hashed password
 */
export async function slowHash(passwordBuf: Uint8Array, salt: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        pbkdf2(passwordBuf, salt, SLOW_HASH_NUM_ITER, KEY_LENGTH, DIGEST_ALGORITHM, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(Buffer.from(derivedKey));
            }
        });
    });
}

/**
 * Performs a fast hash using HKDF.
 *
 * @param additionalInfo The additional information to be used
 * @param salt The salt to be used
 * @returns The hashed additional information
 */
export async function fastHash(additionalInfo: KeygenAdditionalInfo, salt: Buffer): Promise<Buffer> {
    const key = await hkdf(DIGEST_ALGORITHM, JSON.stringify(additionalInfo), new Uint8Array(salt), "", KEY_LENGTH);
    return Buffer.from(key);
}

/**
 * Generates a cryptographic key using a combination of PBKDF2 and HKDF methods.
 *
 * @param password The password to be used
 * @param additionalInfo Additional information to be included in the key generation
 * @param salt A buffer representing the salt value
 * @returns A buffer containing the generated key
 */
export default async function generateKey(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    salt: Buffer,
): Promise<Buffer> {
    const passwordBuf = normalizePassword(password);
    const iKey1 = await slowHash(passwordBuf, salt);
    const iKey2 = await fastHash(additionalInfo, salt);
    return xorBuffer(iKey1, iKey2);
}
