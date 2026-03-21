import { type _SRPGroup, getSRPGroup } from "@lib/auth/srp";
import ExEF from "@lib/exef";
import { popFetch, timedFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Fetches the SRP group size from the server, and returns the corresponding
 * {@link SRPGroup} object.
 *
 * @param apiURL The URL of the API server to query.
 * @returns The SRP group size, or an error message.
 */
export async function getGroup(apiURL: string): Promise<{ group?: _SRPGroup; error?: string }> {
    try {
        const response = await timedFetch(`${apiURL}/auth/group-size`);
        const groupSize = parseInt(await response.text());
        return { group: getSRPGroup(groupSize) };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

/**
 * Fetches a new authentication token from the server.
 *
 * @param auth The authentication provider
 * @returns A promise which resolves to an object with a success boolean and the new token, or an
 *      error message
 */
export async function getNewToken(auth: AuthProvider): Promise<{ success: boolean; error?: string; token?: string }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/auth/token`, auth.authInfo!.key!, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: await response.text() };
        default:
            return { success: false, error: "Unknown error" };
    }

    const token = ExEF.decrypt(auth.authInfo!.key, Buffer.from(await response.arrayBuffer())).toString("utf-8");
    return { success: true, token };
}
