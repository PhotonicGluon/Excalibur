import ExEF from "@lib/crypto/exef";
import { popFetch } from "@lib/network";

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL the URL of the API server to query
 * @param token authentication token for accessing the server
 * @param e2eeKey the key used to decrypt the end-to-end encrypted communications
 * @returns a promise which resolves to an object containing the success status, an optional error
 *      message, and an optional encrypted vault key
 */
export async function getVaultKey(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{ success: boolean; error?: string; encryptedKey?: Buffer }> {
    // Fetch the vault key
    const response = await popFetch(`${apiURL}/users/vault`, e2eeKey, {
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

    const data = await ExEF.decryptResponse<{ key_enc: string }>(e2eeKey, response);
    return { success: true, encryptedKey: Buffer.from(data!.key_enc, "base64") };
}
