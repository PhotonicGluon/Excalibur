import ExEF from "@lib/crypto/exef";
import { type ItemType } from "@lib/files/structures";
import { popFetch } from "@lib/network";
import { IS_DEV, b64encodeURLSafe } from "@lib/util";

import { AuthProvider } from "@components/auth/context";

/**
 * Deletes the item at the given path.
 *
 * @param auth The current authentication provider.
 * @param path The path to the item to delete.
 * @param isDir If true, the path is to a directory and the directory should be deleted recursively.
 *      If false, the path is to a file and only the file itself should be deleted.
 * @param force If true, the directory will be deleted even if it is not empty.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message. If the item was deleted successfully, the `deletedType` field will also be set to
 *      `"directory"` or `"file"` to indicate the type of item that was deleted.
 */
export async function deleteItem(
    auth: AuthProvider,
    path: string,
    isDir?: boolean,
    force?: boolean,
): Promise<{ success: boolean; error?: string; deletedType?: ItemType }> {
    let additionalHeaders = {};
    if (!IS_DEV) {
        const encryptedPath = new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(path, "utf-8"));
        path = b64encodeURLSafe(encryptedPath);
        additionalHeaders = { "X-Encrypted": "true" };
    }

    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/delete/${path}?as_dir=${isDir ? "true" : "false"}&force=${force ? "true" : "false"}`,
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
            return { success: false, error: "Path not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 412:
            return { success: false, error: "Cannot delete root directory" };
        case 417:
            return { success: false, error: "Cannot delete directory if it is not empty (and `force` is not set)" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, deletedType: isDir ? "directory" : "file" };
}
