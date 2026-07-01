import ExEF from "@lib/crypto/exef";
import { popFetch } from "@lib/network";
import { b64encodeURLSafe } from "@lib/util";

import { AuthProvider } from "@components/auth/context";

/**
 * Moves the item at the given path to the new destination folder.
 *
 * @param auth The current authentication provider
 * @param path The path to the item to move
 * @param destFolder The new destination path for the item
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function moveItem(
    auth: AuthProvider,
    path: string,
    destFolder: string,
): Promise<{ success: boolean; error?: string }> {
    const encryptedPath = new ExEF(auth.authInfo!.key!).encrypt(Buffer.from(path, "utf-8"));
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/move/${b64encodeURLSafe(encryptedPath)}`,
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
            body: new ExEF(auth.authInfo!.key!).encrypt(Buffer.from(destFolder, "utf-8")),
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item/destination not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 409:
            return { success: false, error: "Item with name already exists at destination" };
        case 412:
            return { success: false, error: "Cannot move root directory" };
        case 414:
            return { success: false, error: "Path too long" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
