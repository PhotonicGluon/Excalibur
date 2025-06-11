import { pbkdf2 } from "crypto";

const DIGEST_ALGORITHM = "sha256";
const KEY_LENGTH = 32; // In bytes
const NUM_ITER = 650_000;

// TODO: Add a function that normalizes the password

export async function slowHash(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        pbkdf2(password, salt, NUM_ITER, KEY_LENGTH, DIGEST_ALGORITHM, (err, derivedKey) => {
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
    return await slowHash(password, salt);
}
