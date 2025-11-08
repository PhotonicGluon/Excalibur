import packageInfo from "@root/package.json";

import { timedFetch } from "./fetch";

export interface APICheckResult {
    /** Whether the server is reachable */
    reachable: boolean;
    /** Whether the URL is a valid API URL */
    valid: boolean | null;
    /** Whether the API is compatible with the current version of Excalibur */
    compatible: boolean | null;
    /** The version of the API server; only present if valid and compatible */
    version?: string;
    /** An optional error message */
    error?: string;
}

/**
 * Checks if the given API url is valid.
 *
 * @param apiURL The API URL to check
 * @param timeout The timeout for the request
 * @returns A promise that resolves to an APICheckResult
 */
export async function checkAPIUrl(apiURL: string, timeout?: number): Promise<APICheckResult> {
    // Check connectivity (and validity) of the API server
    const connectionResult = await checkValidity(apiURL, timeout);
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

    return { reachable: true, valid: true, compatible: true, version: connectionResult.version };
}

/**
 * Checks if the given API url is valid.
 *
 * @param apiURL The API URL to check
 * @param timeout The timeout for the request
 * @returns A promise that resolves to an object with three properties:
 *      - `reachable`: Whether the server is reachable
 *      - `valid`: Whether the URL is a valid API URL
 *      - `version`: The version of the API server
 *      - `error`: An optional error message
 */
async function checkValidity(
    apiURL: string,
    timeout?: number,
): Promise<{ reachable: boolean; valid: boolean; version?: string; error?: string }> {
    try {
        const response = await timedFetch(`${apiURL}/well-known/version`, {}, timeout);
        switch (response.status) {
            case 200:
                return { reachable: true, valid: true, version: (await response.json()).version };
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
        const response = await timedFetch(
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
