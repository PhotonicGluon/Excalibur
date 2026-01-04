import { popFetch, timedFetch } from "./fetch";

/**
 * Checks if the authentication token is valid.
 *
 * @param apiURL The API URL
 * @param token The authentication token
 * @param masterKey The master key to use for authentication
 * @returns A promise which resolves to an object with a success boolean and optionally a boolean
 *      describing whether the authentication token is still valid
 */
export async function heartbeat(
    apiURL: string,
    token: string,
    masterKey: Buffer,
): Promise<{ success: boolean; authValid?: boolean }> {
    try {
        const response = await popFetch(`${apiURL}/well-known/heartbeat`, masterKey, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });
        switch (response.status) {
            case 200:
                // Continue with normal flow
                break;
            case 202:
                // Continue with normal flow
                break;
            default:
                return { success: false };
        }
        return { success: true, authValid: response.status === 202 };
    } catch {
        return { success: false };
    }
}

/**
 * Gets the server version.
 *
 * @param apiURL The API URL
 * @returns A promise which resolves to an object with a success boolean and optionally the server
 *      version
 */
export async function getServerVersion(apiURL: string): Promise<{ success: boolean; version?: string }> {
    const response = await timedFetch(`${apiURL}/well-known/version`);
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        default:
            return { success: false };
    }

    const data = await response.json();
    return { success: true, version: data.version };
}

/**
 * Gets the server information.
 *
 * @param apiURL The API URL
 * @returns A promise which resolves to an object with a success boolean and optionally the server
 *      version and time
 */
export async function getServerInfo(apiURL: string): Promise<{ success: boolean; version?: string; time?: Date }> {
    const response = await timedFetch(`${apiURL}/well-known/info`);
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        default:
            return { success: false };
    }

    const data = await response.json();
    return { success: true, version: data.version, time: new Date(data.time) };
}
