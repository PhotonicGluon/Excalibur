import { IS_DEV } from "@lib/consts";
import ExEF from "@lib/crypto/exef";
import { FileLike } from "@lib/files/structures";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Gets every descendant of a folder (i.e., its children, their children, and so on).
 *
 * The folder itself is not included in the result. Each item's `fullpath` is relative to the vault
 * root.
 *
 * @param auth the current authentication provider
 * @param folderID the ID of the folder to get the descendants of
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the descendant items
 */
export async function getSubtree(
    auth: AuthProvider,
    folderID: string,
): Promise<{ success: boolean; error?: string; items?: FileLike[] }> {
    let additionalHeaders = {};
    if (!IS_DEV) {
        const encryptedFolderID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(folderID, "utf-8"),
        );
        folderID = b64encodeURLSafe(encryptedFolderID);
        additionalHeaders = { "X-Encrypted": "true" };
    }

    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/subtree/${folderID}`, auth.authInfo!.key!, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.getToken()}`, ...additionalHeaders },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 400:
            return { success: false, error: "Item is not a folder" };
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const items = (await new ExEF(auth.authInfo!.key!).decryptResponse<FileLike[]>(response))!;
    return { success: true, items };
}
