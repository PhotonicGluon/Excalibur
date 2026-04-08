import { AuthProtocol } from "@lib/auth/enums";
import ExEF from "@lib/exef";
import { popFetch, timedFetch } from "@lib/network";
import { b64decode } from "@lib/util";

/**
 * Checks if the user exists on the server.
 *
 * @param apiURL The URL of the Excalibur API
 * @param username The username to check
 * @returns Whether the user exists
 */
export async function checkUser(apiURL: string, username: string): Promise<boolean> {
    const response = await timedFetch(`${apiURL}/users/check/${username}`, {
        method: "HEAD",
    });
    if (response.status === 404) {
        return false;
    }

    return true;
}

/**
 * Retrieves the security details from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve security details for
 * @returns A promise which resolves to an object representing the security details of the user. If
 *      the user does not exist, the promise resolves to an object with `success` set to `false` and
 *      an error message
 */
export async function getSecurityDetails(
    apiURL: string,
    username: string,
): Promise<{
    success: boolean;
    aukSalt?: Buffer;
    authProtocol?: AuthProtocol;
    obfuscatedNames?: boolean;
    srpSalt?: Buffer;
    error?: string;
}> {
    const response = await timedFetch(`${apiURL}/users/security/${username}`, {
        method: "GET",
    });
    switch (response.status) {
        case 200:
            break;
        case 404:
            return { success: false, error: "Security details file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return {
        success: true,
        aukSalt: b64decode(data["auk_salt"]),
        authProtocol: data["auth_protocol"] as AuthProtocol,
        obfuscatedNames: data["obfuscated_names"],
        srpSalt: data["srp_salt"] !== null ? b64decode(data["srp_salt"]) : undefined,
    };
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
): Promise<{ success: boolean; error?: string; encryptedKey?: Buffer }> {
    // Fetch the vault key
    const response = await popFetch(`${apiURL}/users/vault/${username}`, e2eeKey, {
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
    return { success: true, encryptedKey: Buffer.from(data.key_enc, "base64") };
}
