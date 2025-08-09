import ExEF from "@lib/exef";

export interface EncryptedVaultKey {
    /** Encrypted vault key as an ExEF stream */
    encryptedKey: Buffer;
}

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the vault key for
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @returns A promise which resolves to an object containing the success status, an optional error
 *      message, and an optional encrypted vault key
 */
export async function getVaultKey(
    apiURL: string,
    username: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{ success: boolean; error?: string; encryptedKey?: EncryptedVaultKey }> {
    // Fetch the vault key
    const response = await fetch(`${apiURL}/users/vault/${username}`, {
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
    const encryptedData = {
        encryptedKey: Buffer.from(data.key_enc, "base64"),
    };
    return { success: true, encryptedKey: encryptedData };
}
