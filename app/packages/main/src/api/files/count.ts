import ExEF from "@lib/crypto/exef";
import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Counts the number of items owned by the current user.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the item count
 */
export async function getCount(auth: AuthProvider): Promise<{ success: boolean; error?: string; count?: number }> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/count`,
        auth.authInfo!.key!,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
            },
        },
        null,
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const count = await new ExEF(auth.authInfo!.key).decryptResponse<number>(response);
    return { success: true, count: count! };
}
