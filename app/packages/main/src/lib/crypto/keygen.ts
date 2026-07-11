import { argon2d } from "@noble/hashes/argon2.js";
import * as Comlink from "comlink";
import { pbkdf2 } from "pbkdf2";
import randomBytes from "randombytes";

import ExEF from "@lib/crypto/exef";
import HKDF from "@lib/crypto/hkdf";
import { xorBuffer } from "@lib/util";
import { AUKGenerationProcessor } from "@lib/workers/generate-auk";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes

export enum KeyGenAlgorithm {
    PBKDF2 = "pbkdf2",
    Argon2d = "argon2d",
}

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
export async function generateKey(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    salt: Buffer,
    slowHash: KeyGenAlgorithm = KeyGenAlgorithm.Argon2d,
    onProgress?: (progress: number) => void,
): Promise<Buffer> {
    const passwordBuf = normalizePassword(password);
    const iKey1 =
        slowHash === KeyGenAlgorithm.PBKDF2
            ? await slowHashPBKDF2(passwordBuf, salt)
            : slowHashArgon2d(passwordBuf, salt, onProgress);
    const iKey2 = fastHash(additionalInfo, salt);
    return xorBuffer(iKey1, iKey2);
}

/**
 * Generates a data object containing the account unlock key (AUK) and its salt.
 *
 * @param password the password to be used
 * @param additionalInfo additional information to be included in the key generation
 * @param salt optional existing AUK salt to use instead of generating a new one
 * @param slowHash the slow hash function to use
 * @param onProgress optional callback to report progress
 * @returns an object containing the AUK and the AUK salt
 */
export async function generateAUK(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    salt?: Buffer,
    slowHash: KeyGenAlgorithm = KeyGenAlgorithm.Argon2d,
    onProgress?: (progress: number) => void,
): Promise<{
    key: Buffer;
    salt: Buffer;
}> {
    const worker = new Worker(new URL("@lib/workers/generate-auk", import.meta.url), { type: "module" });
    const processor = Comlink.wrap<AUKGenerationProcessor>(worker);

    let aukData;
    try {
        aukData = await processor.generateAUK(
            password,
            additionalInfo,
            salt,
            slowHash,
            // `proxy()` ensures the callback function works across threads
            onProgress ? Comlink.proxy(onProgress) : undefined,
        );
    } finally {
        // Free up resources
        worker.terminate();
    }

    return aukData;
}

/**
 * Generates a data object containing the account unlock key (AUK) and the encrypted vault key.
 *
 * @param password the password to be used
 * @param additionalInfo additional information to be included in the key generation
 * @param existingVaultKey optional existing vault key to use instead of generating a new one
 * @param slowHash the slow hash function to use
 * @param onProgress optional callback to report progress
 * @returns an object containing the AUK and the encrypted vault key
 */
export async function generateVaultKeys(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    existingVaultKey?: Buffer,
    slowHash: KeyGenAlgorithm = KeyGenAlgorithm.Argon2d,
    onProgress?: (progress: number) => void,
) {
    const { key: auk, salt: aukSalt } = await generateAUK(
        password,
        additionalInfo,
        undefined, // No AUK salt is provided
        slowHash,
        onProgress,
    );
    const vaultKey = existingVaultKey ?? randomBytes(32);
    const encryptedVaultKey = new ExEF(auk).encrypt(vaultKey);

    return { auk: { key: Buffer.from(auk), salt: aukSalt }, vault: { key: vaultKey, encryptedKey: encryptedVaultKey } };
}

export default generateKey;
