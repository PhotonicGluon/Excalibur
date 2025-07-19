/**
 * Checks if the given URL is reachable.
 *
 * @param url The URL to check.
 * @param timeout The timeout in seconds.
 * @returns `true` if the URL is reachable, `false` otherwise.
 */
export async function checkConnection(url: string, timeout: number = 5): Promise<boolean> {
    // Try to connect
    try {
        await fetch(url, { signal: AbortSignal.timeout(timeout * 1000) });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

/**
 * Checks if the authentication token is valid.
 *
 * @param apiURL The API URL.
 * @param token The authentication token.
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
    } catch (e) {
        return { success: false };
    }
}

/**
 * Gets the server version.
 *
 * @param apiURL The API URL.
 * @returns A promise which resolves to an object with a success boolean and optionally the server
 *      version.
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

    return { success: true, version: await response.text() };
}

/**
 * Gets the server time.
 *
 * @param apiURL The API URL.
 * @returns A promise which resolves to an object with a success boolean and optionally the server
 *      time.
 */
export async function getServerTime(apiURL: string): Promise<{ success: boolean; time?: string }> {
    const response = await fetch(`${apiURL}/well-known/clock`);
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        default:
            return { success: false };
    }

    return { success: true, time: await response.text() };
}
