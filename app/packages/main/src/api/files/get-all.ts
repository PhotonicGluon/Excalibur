import ExEF from "@lib/crypto/exef";
import { FileLike } from "@lib/files/structures";
import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Gets all items owned by the current user.
 *
 * @param auth the current authentication provider
 * @param timeout the timeout for the request in seconds
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the items
 */
export async function getAllItems(
    auth: AuthProvider,
    timeout?: number,
): Promise<{ success: boolean; error?: string; items?: FileLike[] }> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/all`,
        auth.authInfo!.key!,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
            },
        },
        timeout,
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

    const items = await new ExEF(auth.authInfo!.key).decryptResponse<FileLike[]>(response);
    return { success: true, items: items! };
}
