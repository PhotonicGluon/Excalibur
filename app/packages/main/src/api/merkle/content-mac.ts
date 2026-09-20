import ExEF from "@lib/crypto/exef";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Gets the content MAC inputs for the given items.
 *
 * The item's content MAC inputs will be `null` if either
 * - the item does not exist;
 * - the item does not belong to the user; or
 * - the item is a folder
 *
 * @param auth the current authentication provider
 * @param itemIDs the IDs of the items to get content MAC inputs for
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message, or a mapping of item ID to its content MAC input (Base64 or null)
 */
export async function getContentMACInputs(
    auth: AuthProvider,
    itemIDs: string[],
): Promise<{ success: boolean; error?: string; inputs?: Record<string, string | null> }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/content-mac-inputs`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify(itemIDs), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const inputs = await new ExEF(auth.authInfo!.key!).decryptResponse<Record<string, string | null>>(response);
    return { success: true, inputs: inputs! };
}
