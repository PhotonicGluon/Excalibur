import ExEF from "@lib/crypto/exef";
import { KeyGenAlgorithm } from "@lib/crypto/keygen";
import { popFetch } from "@lib/network";
import { UserVaultInfo } from "@lib/users/structures";

/**
 * Retrieves the vault info from the server.
 *
 * @param apiURL the URL of the API server to query
 * @param token authentication token for accessing the server
 * @param e2eeKey the key used to decrypt the end-to-end encrypted communications
 * @returns a promise which resolves to an object containing the success status, an optional error
 *      message, and optional vault info fields
 */
export async function getVaultInfo(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{
    success: boolean;
    error?: string;
    keygenAlgorithm?: KeyGenAlgorithm;
    aukSalt?: Buffer;
    encryptedKey?: Buffer;
    vaultInfo?: UserVaultInfo;
}> {
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

    const data = (await ExEF.decryptResponse<{
        keygen_algorithm: string;
        auk_salt: string;
        key_enc: string;
        vault_info: string;
    }>(e2eeKey, response))!;
    return {
        success: true,
        keygenAlgorithm: data.keygen_algorithm as KeyGenAlgorithm,
        aukSalt: Buffer.from(data.auk_salt, "base64"),
        encryptedKey: Buffer.from(data.key_enc, "base64"),
        vaultInfo: data.vault_info ? (JSON.parse(data.vault_info) as UserVaultInfo) : {},
    };
}

/**
 * Edits the user vault information on the server.
 *
 * @param apiURL the URL of the API server to query
 * @param token authentication token for accessing the server
 * @param e2eeKey the key used to decrypt the end-to-end encrypted communications
 * @param keygenAlgorithm the new key generation algorithm
 * @param info the new user vault information to set
 * @returns a promise which resolves to an object containing the success status, an optional error
 *      message
 */
export async function editVaultInfo(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
    keygenAlgorithm: KeyGenAlgorithm,
    info: UserVaultInfo,
): Promise<{ success: boolean; error?: string }> {
    const rawBody = { keygen_algorithm: keygenAlgorithm, vault_info: JSON.stringify(info) };
    const response = await popFetch(`${apiURL}/users/vault`, e2eeKey, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: new ExEF(e2eeKey).encrypt(Buffer.from(JSON.stringify(rawBody), "utf-8")),
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "User not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
