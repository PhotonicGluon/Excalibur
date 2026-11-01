import { IS_DEV } from "@lib/consts";
import ExEF from "@lib/crypto/exef";
import { type ItemType } from "@lib/files/structures";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";
import { clearFolderIDCache } from "@api/files/folder/resolve";

import { AuthProvider } from "@components/auth/context";

/**
 * Deletes the item with the given ID.
 *
 * @param auth the current authentication provider.
 * @param itemID the ID of the item to delete.
 * @param isDir if true, the item is a directory and the directory should be deleted recursively.
 *      if false, the item is a file and only the file itself should be deleted.
 * @param force if true, the directory will be deleted even if it is not empty.
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message. If the item was deleted successfully, the `deletedType` field will also be set to
 *      `"directory"` or `"file"` to indicate the type of item that was deleted.
 */
export async function deleteItem(
    auth: AuthProvider,
    itemID: string,
    isDir?: boolean,
    force?: boolean,
): Promise<{ success: boolean; error?: string; deletedType?: ItemType }> {
    let additionalHeaders = {};
    if (!IS_DEV) {
        const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(itemID, "utf-8"));
        itemID = b64encodeURLSafe(encryptedID);
        additionalHeaders = { "X-Encrypted": "true" };
    }

    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/delete/${itemID}?as_dir=${isDir ? "true" : "false"}&force=${force ? "true" : "false"}`,
        auth.authInfo!.key!,
        {
            method: "DELETE",
            headers: { Authorization: `Bearer ${auth.getToken()}`, ...additionalHeaders },
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 400:
            return { success: false, error: "Cannot delete directory if `as_dir` is not set" };
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        case 406:
            return { success: false, error: "Illegal or invalid ID" };
        case 412:
            return { success: false, error: "Cannot delete root directory" };
        case 417:
            return { success: false, error: "Cannot delete directory if it is not empty (and `force` is not set)" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Folder paths may have changed, so clear the folder ID cache
    clearFolderIDCache();

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true, deletedType: isDir ? "directory" : "file" };
}
