import hkdf from "@panva/hkdf";
import { pbkdf2 } from "crypto";

import { xorBuffer } from "@lib/util";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes
const SLOW_HASH_NUM_ITER = 650_000;

export interface KeygenAdditionalInfo {
    /** URL of the server */
    serverURL: string;
}

// TODO: Add a function that normalizes the function

export async function slowHash(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        pbkdf2(password, salt, SLOW_HASH_NUM_ITER, KEY_LENGTH, DIGEST_ALGORITHM, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(Buffer.from(derivedKey));
            }
        });
    });
}

export async function fastHash(additionalInfo: KeygenAdditionalInfo, salt: Buffer): Promise<Buffer> {
    const key = await hkdf(DIGEST_ALGORITHM, JSON.stringify(additionalInfo), new Uint8Array(salt), "", KEY_LENGTH);
    return Buffer.from(key);
}

/**
 * Generates a cryptographic key using a combination of PBKDF2 and HKDF methods.
 *
 * @param password The password to be used.
 * @param additionalInfo Additional information to be included in the key generation.
 * @param salt A buffer representing the salt value.
 * @returns A buffer containing the generated key.
 */
export async function generateKey(
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    salt: Buffer,
): Promise<Buffer> {
    const iKey1 = await slowHash(password, salt);
    const iKey2 = await fastHash(additionalInfo, salt);
    return xorBuffer(iKey1, iKey2);
}

export default generateKey;
