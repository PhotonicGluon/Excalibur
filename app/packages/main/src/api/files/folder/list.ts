import { IS_DEV } from "@lib/consts";
import ExEF from "@lib/crypto/exef";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";
import { ItemWire } from "@api/files/get-all";

import { AuthProvider } from "@components/auth/context";

/**
 * A directory as sent by the server.
 *
 * Its name, and the names of its items, are still encrypted (or are legacy plaintext).
 */
export type DirectoryWire = ItemWire & { type: "directory" };

/**
 * Lists the contents of a directory.
 *
 * @param auth the current authentication provider
 * @param folderID the ID of the folder to list (use `.` to specify the root directory)
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the directory object
 */
export async function listdir(
    auth: AuthProvider,
    folderID: string,
): Promise<{ success: boolean; directory?: DirectoryWire; error?: string }> {
    try {
        let additionalHeaders = {};
        if (!IS_DEV || folderID === ".") {
            // A bare `.` would get stripped from the URL, so it must always be encrypted
            const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
                Buffer.from(folderID, "utf-8"),
            );
            folderID = b64encodeURLSafe(encryptedID);
            additionalHeaders = { "X-Encrypted": "true" };
        }

        const response = await popFetch(`${auth.serverInfo!.apiURL}/files/list/${folderID}`, auth.authInfo!.key!, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
                ...additionalHeaders,
            },
        });
        switch (response.status) {
            case 200:
                // Continue with normal flow
                break;
            case 401:
                return { success: false, error: "Unauthorized" };
            case 404:
                return { success: false, error: "Folder not found or is not a directory" };
            case 422:
                return { success: false, error: "Validation error" };
            default:
                return { success: false, error: "Unknown error" };
        }

        const directory = await new ExEF(auth.authInfo!.key!).decryptResponse<DirectoryWire>(response);
        return { success: true, directory: directory! };
    } catch (_error) {
        return { success: false, error: "Unknown error occurred" };
    }
}
