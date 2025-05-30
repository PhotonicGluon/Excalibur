import hkdf from "@panva/hkdf";
import { pbkdf2Sync } from "crypto";

import { xorBuffer } from "@lib/util";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes
const SLOW_HASH_NUM_ITER = 650_000;

export function slowHash(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, SLOW_HASH_NUM_ITER, KEY_LENGTH, DIGEST_ALGORITHM);
}

export async function fastHash(secretString: string, salt: Buffer): Promise<Buffer> {
    const key = await hkdf(DIGEST_ALGORITHM, secretString, new Uint8Array(salt), "", KEY_LENGTH);
    return Buffer.from(key);
}

/**
 * Generates a cryptographic key using a combination of PBKDF2 and HKDF methods.
 *
 * @param password The password to be used.
 * @param secretString The secret string.
 * @param salt A buffer representing the salt value.
 * @returns A buffer containing the generated key.
 */
export async function generateKey(password: string, secretString: string, salt: Buffer): Promise<Buffer> {
    // TODO: Add tests
    const iKey1 = slowHash(password, salt);
    const iKey2 = await fastHash(secretString, salt);
    return xorBuffer(iKey1, iKey2);
}
