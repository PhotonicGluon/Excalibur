import { IS_DEV } from "@lib/consts";
import ExEF from "@lib/crypto/exef";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Checks if an item exists.
 *
 * @param auth the current authentication provider
 * @param itemID the ID of the item to check (use `.` to specify the root directory)
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the type of the item
 */
export async function checkItem(
    auth: AuthProvider,
    itemID: string,
): Promise<{ success: boolean; error?: string; type?: "file" | "directory" }> {
    let additionalHeaders = {};
    if (!IS_DEV || itemID === ".") {
        // A bare `.` would get stripped from the URL, so it must always be encrypted
        const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(itemID, "utf-8"));
        itemID = b64encodeURLSafe(encryptedID);
        additionalHeaders = { "X-Encrypted": "true" };
    }

    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/check/item/${itemID}`, auth.authInfo!.key!, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.getToken()}`, ...additionalHeaders },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, type: response.status === 200 ? "file" : "directory" };
}

/**
 * Checks the existence of multiple names in a folder.
 *
 * @param auth the current authentication provider
 * @param parentID the ID of the folder to look in (use `.` to specify the root directory)
 * @param names the names to check
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the result of the check
 */
export async function checkNames(
    auth: AuthProvider,
    parentID: string,
    names: string[],
): Promise<{ success: boolean; error?: string; result?: boolean[] }> {
    const numNames = names.length;
    if (numNames === 0) {
        // No names to check, so end early
        return { success: true, result: [] };
    }

    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/check/names`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify({ parent_id: parentID, names }), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Folder not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Decrypt the response if it is encrypted
    let content: Buffer = Buffer.from(await response.arrayBuffer());
    if (response.headers.get("X-Encrypted") === "true") {
        content = await new ExEF(auth.authInfo!.key!).decrypt(content);
    }

    // Split bytes back into existence/non-existence
    const result: boolean[] = [];
    let currByte = content[0]; // We're guaranteed at least one name
    for (let i = 0; i < numNames; i++) {
        result.push((currByte & 1) === 1);
        currByte >>= 1;
        if (i % 8 === 7) {
            // We've processed all 8 bits of the current byte, so move on
            currByte = content[(i + 1) / 8];
        }
    }

    return { success: true, result };
}

/**
 * Checks the existence of a directory, and whether it is empty.
 *
 * @param auth the current authentication provider
 * @param folderID the ID of the folder to check (use `.` to specify the root directory)
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function checkDir(
    auth: AuthProvider,
    folderID: string,
): Promise<{ success: boolean; error?: string; isEmpty?: boolean }> {
    const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(folderID, "utf-8"));
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/check/dir/${b64encodeURLSafe(encryptedID)}`,
        auth.authInfo!.key!,
        {
            method: "HEAD",
            headers: { Authorization: `Bearer ${auth.getToken()}`, "X-Encrypted": "true" },
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Directory not found" };
        case 406:
            return { success: false, error: "Illegal or invalid ID" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, isEmpty: response.status === 200 };
}
