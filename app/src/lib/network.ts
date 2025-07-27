/**
 * Checks if the given API url is valid.
 *
 * @param apiURL The API URL to check
 * @param timeout Number of seconds to wait for a response before timing out
 * @returns A promise that resolves to an object with three properties:
 *      - `reachable`: Whether the server is reachable
 *      - `validAPIUrl`: Whether the URL is a valid API URL
 *      - `error`: An optional error message
 */
export async function checkAPIUrl(
    apiURL: string,
    timeout: number = 5,
): Promise<{ reachable: boolean; validAPIUrl: boolean; error?: string }> {
    try {
        const response = await fetch(`${apiURL}/well-known/version`, { signal: AbortSignal.timeout(timeout * 1000) });
        switch (response.status) {
            case 200:
                return { reachable: true, validAPIUrl: true };
            default:
                return { reachable: true, validAPIUrl: false, error: "Given URL does not correspond to an API server" };
        }
    } catch (e: unknown) {
        return { reachable: false, validAPIUrl: false, error: (e as Error).message };
    }
}

/**
 * Checks if the authentication token is valid.
 *
 * @param apiURL The API URL
 * @param token The authentication token
 * @returns A promise which resolves to an object with a success boolean and optionally a boolean
 *      describing whether the authentication token is still valid
 */
export async function heartbeat(apiURL: string, token: string): Promise<{ success: boolean; authValid?: boolean }> {
    try {
        const response = await fetch(`${apiURL}/well-known/heartbeat`, {
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
    const response = await fetch(`${apiURL}/well-known/version`);
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
 * Gets the server time.
 *
 * @param apiURL The API URL
 * @returns A promise which resolves to an object with a success boolean and optionally the server
 *      time as a Date object
 */
export async function getServerTime(apiURL: string): Promise<{ success: boolean; time?: Date }> {
    const response = await fetch(`${apiURL}/well-known/clock`);
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        default:
            return { success: false };
    }

    const isoTime = await response.text();
    return { success: true, time: new Date(isoTime) };
}
