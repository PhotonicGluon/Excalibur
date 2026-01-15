import { timedFetch } from "./fetch";

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
 *      information
 */
export async function getServerInfo(
    apiURL: string,
): Promise<{ success: boolean; version?: string; maxUploadSize?: number; time?: Date }> {
    const response = await timedFetch(`${apiURL}/well-known/info`);
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        default:
            return { success: false };
    }

    const data = await response.json();
    return {
        success: true,
        version: data.version,
        maxUploadSize: data.max_upload_size,
        time: new Date(data.time),
    };
}
