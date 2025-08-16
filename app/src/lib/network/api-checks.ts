import packageInfo from "@root/package.json";

export async function checkAPIUrl(
    apiURL: string,
): Promise<{ reachable: boolean; valid: boolean | null; compatible: boolean | null; error?: string }> {
    // Check connectivity (and validity) of the API server
    const connectionResult = await checkValidity(apiURL);
    if (!connectionResult.reachable) {
        return { reachable: false, valid: null, compatible: null, error: connectionResult.error };
    }
    if (!connectionResult.valid) {
        return { reachable: true, valid: false, compatible: null, error: connectionResult.error };
    }

    // Check API compatibility
    const compatibilityResult = await checkCompatibility(apiURL);
    if (!compatibilityResult.valid) {
        return {
            reachable: true,
            valid: true,
            compatible: false,
            error: "This server is not compatible with this version of Excalibur.",
        };
    }

    return { reachable: true, valid: true, compatible: true };
}

/**
 * Checks if the given API url is valid.
 *
 * @param apiURL The API URL to check
 * @param timeout Number of seconds to wait for a response before timing out
 * @returns A promise that resolves to an object with three properties:
 *      - `reachable`: Whether the server is reachable
 *      - `valid`: Whether the URL is a valid API URL
 *      - `error`: An optional error message
 */
async function checkValidity(
    apiURL: string,
    timeout: number = 5,
): Promise<{ reachable: boolean; valid: boolean; error?: string }> {
    try {
        const response = await fetch(`${apiURL}/well-known/version`, { signal: AbortSignal.timeout(timeout * 1000) });
        switch (response.status) {
            case 200:
                return { reachable: true, valid: true };
            default:
                return { reachable: true, valid: false, error: "Given URL does not correspond to an API server" };
        }
    } catch (e: unknown) {
        return { reachable: false, valid: false, error: (e as Error).message };
    }
}

/**
 * Checks if the API is compatible with the current version of Excalibur.
 *
 * @param apiURL The API URL
 * @returns A promise which resolves to an object with a valid boolean
 */
async function checkCompatibility(apiURL: string): Promise<{ valid: boolean }> {
    try {
        const response = await fetch(
            `${apiURL}/well-known/compatible?version=${encodeURIComponent(packageInfo.version)}`,
            {
                method: "GET",
            },
        );
        switch (response.status) {
            case 200:
                // Continue with normal flow
                break;
            default:
                return { valid: false };
        }

        const valid = await response.json();
        return { valid: valid };
    } catch {
        return { valid: false };
    }
}
