import { decryptResponse } from "@lib/crypto";

/**
 * Generates a token for continued authentication.
 *
 * @param apiURL The URL of the Excalibur API.
 * @param handshakeUUID The UUID for the handshake.
 * @param masterKey The master key to use for encrypting the token.
 * @returns A promise which resolves to an object with a success boolean, an optional error message,
 *      and optionally the token.
 */
export async function login(
    apiURL: string,
    handshakeUUID: string,
    masterKey: Buffer,
): Promise<{ success: boolean; error?: string; token?: string }> {
    const response = await fetch(`${apiURL}/security/login`, {
        method: "POST",
        body: handshakeUUID,
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 404:
            return { success: false, error: "Handshake UUID not found or has expired" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await decryptResponse<{ token: string }>(response, masterKey);

    return {
        success: true,
        token: data["token"],
    };
}

/**
 * Logs out a user from the server.
 *
 * @param apiURL The URL of the API server to query.
 * @param token The authorization token for the current session.
 * @returns A promise which resolves to an object indicating the success status and an optional error message.
 */
export async function logout(apiURL: string, token: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${apiURL}/security/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    switch (response.status) {
        case 401:
            return { success: false, error: "Unauthorized or invalid token" };
        case 200:
            break; // Continue with normal flow
        default:
            return { success: false, error: "Unknown error" };
    }

    return {
        success: true,
    };
}
