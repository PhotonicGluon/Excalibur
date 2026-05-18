import ExEF from "@lib/exef";
import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

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
