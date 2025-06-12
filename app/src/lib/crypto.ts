import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { type Algorithm, ExEF, KeySize } from "@lib/exef";

export function encrypt(data: Buffer, masterKey: Buffer, nonce?: Buffer): ExEF {
    const keysize = (8 * masterKey.length) as KeySize;
    const algorithm = `aes-${keysize}-gcm` as Algorithm; // We know master key is 16, 24 or 32 bytes
    if (!nonce) {
        nonce = randomBytes(12);
    }

    const cipher = createCipheriv(algorithm, masterKey, nonce);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return new ExEF(keysize, nonce, cipher.getAuthTag(), encrypted);
}

export function decrypt(encryptedData: ExEF, masterKey: Buffer): Buffer {
    const decipher = createDecipheriv(encryptedData.alg, masterKey, encryptedData.nonce);
    decipher.setAuthTag(encryptedData.tag);

    let decrypted = decipher.update(encryptedData.ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
}

/**
 * Encrypts the given JSON data using the given master key.
 *
 * @param data The JSON data to encrypt.
 * @param masterKey The master key to encrypt the data with.
 * @param nonce A nonce to use for the encryption. If not provided, a 12-byte random one will be generated.
 * @returns Encrypted data.
 */
export function encryptJSON(data: any, masterKey: Buffer, nonce?: Buffer): ExEF {
    return encrypt(Buffer.from(JSON.stringify(data)), masterKey, nonce);
}

/**
 * Decrypts the given encrypted JSON data using the given master key.
 *
 * @param encryptedData The encrypted JSON data to decrypt.
 * @param masterKey The master key to decrypt the data with.
 * @param parse Whether to parse the decrypted data as JSON.
 * @returns The decrypted JSON data.
 * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch).
 */
export function decryptJSON<T>(encryptedData: ExEF, masterKey: Buffer, parse: boolean = true): T {
    const decrypted = decrypt(encryptedData, masterKey);
    if (parse) {
        return JSON.parse(decrypted.toString("utf-8")) as T;
    }
    return decrypted as T;
}

/**
 * Decrypts the response data using the provided master key if the response is encrypted.
 *
 * @param response The HTTP response containing potentially encrypted data.
 * @param masterKey The master key to use for decryption.
 * @param parse Whether to parse the decrypted data as JSON.
 * @returns A promise that resolves to the decrypted data, or the original data if not encrypted.
 * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch).
 */
export async function decryptResponse<T>(response: Response, masterKey: Buffer, parse: boolean = true): Promise<T> {
    let data: T;
    if (response.headers.get("X-Encrypted") === "true") {
        const arrayBuffer = await response.arrayBuffer();
        const responseData = Buffer.from(arrayBuffer);
        const exef = ExEF.fromBuffer(responseData);
        data = decryptJSON<T>(exef, masterKey, parse);
    } else {
        data = (await response.json()) as T;
    }

    return data;
}
