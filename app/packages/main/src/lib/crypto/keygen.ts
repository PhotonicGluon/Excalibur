import { argon2d } from "@noble/hashes/argon2.js";
import { pbkdf2 } from "pbkdf2";

import HKDF from "@lib/crypto/hkdf";
import { xorBuffer } from "@lib/util";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes

export type KeyGenFunction = "pbkdf2" | "argon2d";

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
 * @param password the input password string
 * @returns the UTF-8 byte array of the normalized password
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
 * @param passwordBuf the password buffer to be hashed
 * @param salt the salt to be used
 * @returns a promise that resolves to the hashed password
 */
export async function slowHashPBKDF2(passwordBuf: Uint8Array, salt: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        pbkdf2(passwordBuf, salt, 650_000, KEY_LENGTH, DIGEST_ALGORITHM, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(Buffer.from(derivedKey));
            }
        });
    });
}

/**
 * Performs a slow hash using Argon2d.
 *
 * See https://www.dashlane.com/download/whitepaper-en.pdf, page 40 for the parameters used.
 *
 * @param passwordBuf the password buffer to be hashed
 * @param salt the salt to be used
 * @param onProgress optional callback to report progress
 * @returns the hashed password
 */
export function slowHashArgon2d(
    passwordBuf: Uint8Array,
    salt: Buffer,
    onProgress?: (progress: number) => void,
): Buffer {
    return Buffer.from(
        argon2d(passwordBuf, salt, {
            version: 0x13,
            m: 32768, // Memory cost in KiB
            t: 3, // Iteration count
            p: 2, // Parallelism
            dkLen: KEY_LENGTH,
            onProgress,
        }),
    );
}

/**
 * Performs a fast hash using HKDF.
 *
 * @param additionalInfo the additional information to be used
 * @param salt the salt to be used
 * @returns the hashed additional information
 */
export function fastHash(additionalInfo: KeygenAdditionalInfo, salt: Buffer): Buffer {
    const key = new HKDF(DIGEST_ALGORITHM).hkdf(
        Buffer.from(JSON.stringify(additionalInfo), "utf8"),
        salt,
        Buffer.from([]),
        KEY_LENGTH,
    );
    return key;
}

/**
 * Generates a cryptographic key using a combination of PBKDF2 and HKDF methods.
 *
 * @param password the password to be used
 * @param additionalInfo additional information to be included in the key generation
 * @param salt a buffer representing the salt value
 * @param slowHash the slow hash function to use
 * @param onProgress optional callback to report progress
 * @returns a buffer containing the generated key
 */
export default async function generateKey(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    salt: Buffer,
    slowHash: KeyGenFunction = "pbkdf2",
    onProgress?: (progress: number) => void,
): Promise<Buffer> {
    const passwordBuf = normalizePassword(password);
    const iKey1 =
        slowHash === "pbkdf2"
            ? await slowHashPBKDF2(passwordBuf, salt)
            : slowHashArgon2d(passwordBuf, salt, onProgress);
    const iKey2 = fastHash(additionalInfo, salt);
    return xorBuffer(iKey1, iKey2);
}
