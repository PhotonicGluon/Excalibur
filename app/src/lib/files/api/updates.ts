import { timedFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Renames the item at the given path to the new name.
 *
 * @param auth The current authentication provider.
 * @param path The path to the item to rename.
 * @param newName The new name for the item.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message.
 */
export async function renameItem(
    auth: AuthProvider,
    path: string,
    newName: string,
): Promise<{ success: boolean; error?: string }> {
    const response = await timedFetch(`${auth.serverInfo!.apiURL}/files/rename/${path}`, {
        method: "POST",
        body: newName,
        headers: { Authorization: `Bearer ${auth.authInfo!.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 409:
            return { success: false, error: "Item with that name already exists" };
        case 414:
            return { success: false, error: "Path too long" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
