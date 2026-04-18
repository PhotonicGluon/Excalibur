import ExEF from "@lib/exef";
import { Directory } from "@lib/files/structures";
import { popFetch } from "@lib/network";
import { IS_DEV, b64encodeURLSafe } from "@lib/util";

import { AuthProvider } from "@components/auth/context";

/**
 * Lists the contents of a directory.
 *
 * @param auth The current authentication provider
 * @param path The path to list
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or the directory object
 */
export async function listdir(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; directory?: Directory; error?: string }> {
    try {
        let additionalHeaders = {};
        if (!IS_DEV) {
            const encryptedPath = new ExEF(auth.authInfo!.key!).encrypt(Buffer.from(path, "utf-8"));
            path = b64encodeURLSafe(encryptedPath);
            additionalHeaders = { "X-Encrypted": "true" };
        }

        const response = await popFetch(`${auth.serverInfo!.apiURL}/files/list/${path}`, auth.authInfo!.key!, {
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
                return { success: false, error: "Path not found or is not a directory" };
            case 406:
                return { success: false, error: "Illegal or invalid path" };
            case 422:
                return { success: false, error: "Validation error" };
            default:
                return { success: false, error: "Unknown error" };
        }

        const directory = await ExEF.decryptResponse<Directory>(auth.authInfo!.key, response);
        return { success: true, directory: directory! };
    } catch (_error) {
        return { success: false, error: "Unknown error occurred" };
    }
}
