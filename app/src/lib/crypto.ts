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
