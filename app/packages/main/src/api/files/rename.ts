import ExEF from "@lib/crypto/exef";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";
import { clearFolderIDCache } from "@api/files/folder/resolve";

import { AuthProvider } from "@components/auth/context";

/**
 * Renames the item with the given ID to the new name.
 *
 * @param auth the current authentication provider
 * @param itemID the ID of the item to rename
 * @param newName the new name for the item
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function renameItem(
    auth: AuthProvider,
    itemID: string,
    newName: string,
): Promise<{ success: boolean; error?: string }> {
    const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(itemID, "utf-8"));
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/rename/${b64encodeURLSafe(encryptedID)}`,
        auth.authInfo!.key!,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
                "Content-Type": "application/octet-stream",
                "X-Encrypted": "true",
                "X-Content-Type": "text/plain",
            },
            // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
            body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(newName, "utf-8")),
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        case 406:
            return { success: false, error: "Illegal or invalid ID" };
        case 409:
            return { success: false, error: "Item with that name already exists" };
        case 412:
            return { success: false, error: "Cannot rename root directory" };
        case 414:
            return { success: false, error: "Path too long" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Folder paths may have changed, so clear the folder ID cache
    clearFolderIDCache();

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true };
}
