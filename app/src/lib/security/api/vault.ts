import { decryptResponse } from "@lib/crypto";
import { Algorithm } from "@lib/exef";

export interface EncryptedVaultKey {
    alg: Algorithm;
    nonce: Buffer;
    encryptedKey: Buffer;
    tag: Buffer;
}

/**
 * Checks whether a vault key has been set.
 *
 * @param apiURL The URL of the API server to query
 * @param token Authentication token for accessing the server
 * @returns A promise which resolves to an object indicating the success status and an optional
 *      error message
 */
export async function checkVaultKey(apiURL: string, token: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${apiURL}/security/vault-key`, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${token}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Vault key file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }
    return { success: true };
}

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @returns A promise which resolves to an object containing the success status, an optional error
 *      message, and an optional encrypted vault key
 */
export async function getVaultKey(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{ success: boolean; error?: string; encryptedKey?: EncryptedVaultKey }> {
    // Fetch the vault key
    const response = await fetch(`${apiURL}/security/vault-key`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Vault key file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }
    const data = await decryptResponse<{
        alg: Algorithm;
        nonce: string;
        key_enc: string;
        tag: string;
    }>(response, e2eeKey);

    // Format for returning
    const encryptedKey: EncryptedVaultKey = {
        alg: data.alg,
        nonce: Buffer.from(data.nonce, "base64"),
        encryptedKey: Buffer.from(data.key_enc, "base64"),
        tag: Buffer.from(data.tag, "base64"),
    };
    return { success: true, encryptedKey: encryptedKey };
}

/**
 * Sets up the vault key on the server.
 *
 * @param apiURL The URL of the API server to query
 * @param token Authentication token for accessing the server
 * @param encryptedVaultKey The vault key details to set
 * @returns A promise which resolves to an object containing the success status and an optional
 *      error message
 */
export async function setUpVaultKey(
    apiURL: string,
    token: string,
    encryptedVaultKey: EncryptedVaultKey,
): Promise<{ success: boolean; error?: string }> {
    // TODO: Encrypt the body of this endpoint

    const response = await fetch(`${apiURL}/security/vault-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            alg: encryptedVaultKey.alg,
            nonce: encryptedVaultKey.nonce.toString("base64"),
            key_enc: encryptedVaultKey.encryptedKey.toString("base64"),
            tag: encryptedVaultKey.tag.toString("base64"),
        }),
    });
    switch (response.status) {
        case 201:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "Vault key file already exists" };
        case 422:
            return { success: false, error: "Invalid base64 string" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
