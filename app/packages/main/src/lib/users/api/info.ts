import ExEF from "@lib/crypto/exef";
import { popFetch } from "@lib/network";
import { AdditionalUserInfo } from "@lib/users/structures";

/**
 * Retrieves additional user information from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the additional information for
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @returns A promise which resolves to an object containing the success status, an optional error
 *      message, and optional additional user information
 */
export async function getAdditionalUserInfo(
    apiURL: string,
    username: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{ success: boolean; error?: string; info?: AdditionalUserInfo }> {
    const response = await popFetch(`${apiURL}/users/info/get/${username}`, e2eeKey, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
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

    const info = await ExEF.decryptResponse<AdditionalUserInfo>(e2eeKey, response);
    return { success: true, info: info ?? {} };
}

/**
 * Edits additional user information on the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the additional information for
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @param info The new additional user information to set
 * @returns A promise which resolves to an object containing the success status, an optional error
 *      message
 */
export async function editAdditionalUserInfo(
    apiURL: string,
    username: string,
    token: string,
    e2eeKey: Buffer,
    info: AdditionalUserInfo,
): Promise<{ success: boolean; error?: string }> {
    const rawInfo = JSON.stringify(info);
    const response = await popFetch(`${apiURL}/users/info/edit/${username}`, e2eeKey, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: new ExEF(e2eeKey).encrypt(Buffer.from(rawInfo, "utf-8")),
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
