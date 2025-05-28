import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type Algorithm = "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm";
interface EncryptedResponse {
    /** Name of the encryption algorithm */
    alg: Algorithm;
    /** Base64 encoded nonce for the encryption */
    nonce: string;
    /** Base64 encoded ciphertext to decrypt using the master key */
    ciphertext: string;
    /** Base64 encoded AES-GCM tag */
    tag: string;
}

export function encrypt(data: Buffer, masterKey: Buffer, nonce?: Buffer): EncryptedResponse {
    const algorithm = `aes-${8 * masterKey.length}-gcm` as Algorithm; // We know master key is 16, 24 or 32 bytes
    if (!nonce) {
        nonce = randomBytes(12);
    }

    const cipher = createCipheriv(algorithm, masterKey, nonce);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return {
        alg: algorithm,
        nonce: nonce.toString("base64"),
        ciphertext: encrypted.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
    };
}

export function decrypt(response: EncryptedResponse, masterKey: Buffer): Buffer {
    const decipher = createDecipheriv(response.alg, masterKey, Buffer.from(response.nonce, "base64"));
    decipher.setAuthTag(Buffer.from(response.tag, "base64"));

    let decrypted = decipher.update(Buffer.from(response.ciphertext, "base64"));
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
export function encryptJSON(data: any, masterKey: Buffer, nonce?: Buffer): EncryptedResponse {
    return encrypt(Buffer.from(JSON.stringify(data)), masterKey, nonce);
}

/**
 * Decrypts the given encrypted JSON data using the given master key.
 *
 * @param response The encrypted JSON data to decrypt.
 * @param masterKey The master key to decrypt the data with.
 * @returns The decrypted JSON data.
 */
export function decryptJSON(response: EncryptedResponse, masterKey: Buffer): any {
    return JSON.parse(decrypt(response, masterKey).toString("utf-8"));
}
