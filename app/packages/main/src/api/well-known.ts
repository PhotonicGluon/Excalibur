import { timedFetch } from "@api/fetch";

/**
 * Gets the server version.
 *
 * @param apiURL the API URL
 * @returns a promise which resolves to an object with a success boolean and optionally the server
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
